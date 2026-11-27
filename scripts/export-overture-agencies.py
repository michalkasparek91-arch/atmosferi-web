"""Export one country's agency websites for the municipal collector. Requires DuckDB with httpfs."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
from tempfile import NamedTemporaryFile
from urllib.parse import urljoin
from urllib.request import urlopen

import duckdb


def get_json(url):
    with urlopen(url, timeout=45) as response:
        return json.load(response)


# Conservative partition filters. Countries with overseas territories or
# antimeridian crossings use the address filter alone.
BOUNDS = {
    "DE": (5.7, 47.1, 15.2, 55.2), "CZ": (12, 48.4, 19, 51.2),
    "SK": (16.7, 47.6, 22.7, 49.7), "AT": (9.4, 46.3, 17.3, 49.1),
    "CH": (5.8, 45.7, 10.6, 47.9), "PL": (14, 48.9, 24.3, 55),
    "HU": (16, 45.7, 23, 48.7),
}


def export(release, output, country="DE"):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", release):
        raise ValueError("Expected YYYY-MM-DD.N release")
    bounds = BOUNDS.get(country, (-180, -90, 180, 90))
    xmin, ymin, xmax, ymax = bounds
    collection = f"https://stac.overturemaps.org/{release}/places/place/collection.json"
    links = [urljoin(collection, link["href"]) for link in get_json(collection)["links"] if link["rel"] == "item"]
    files = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for item in pool.map(get_json, links):
            west, south, east, north = item["bbox"]
            if west <= xmax and east >= xmin and south <= ymax and north >= ymin:
                files.append(item["assets"]["aws"]["href"])
    if not files:
        raise ValueError("No intersecting Places partitions")
    with duckdb.connect() as db:
        db.execute("set threads=3")
        result = db.execute("""
            with candidates as (
                select id, names.primary as title, taxonomy.primary as category, websites, addresses, bbox,
                       list_distinct(list_transform(sources, lambda s: s.dataset)) as datasets
                from read_parquet(?)
                where bbox.xmin between ? and ? and bbox.ymin between ? and ?
                  and len(websites)>0 and operating_status is distinct from 'permanently_closed'
                  and taxonomy.primary in ('advertising_agency','internet_marketing_service','marketing_agency','public_relations')
                  and list_contains(list_transform(addresses, lambda a: upper(a.country)), ?)
            )
            select id, title, category, websites, a.locality, datasets, a.postcode, a.region,
                   cast(bbox.xmin as double), cast(bbox.ymin as double)
            from candidates, unnest(addresses) as address(a)
            where upper(a.country)=?
            order by id, a.locality, a.postcode, a.region
        """, [files, xmin, xmax, ymin, ymax, country, country])
        output.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        temporary = NamedTemporaryFile(mode="w", encoding="utf8", dir=output.parent, delete=False)
        staging = Path(temporary.name)
        try:
            with temporary:
                temporary.write(json.dumps({"release": release, "country": country})[:-1] + ', "rows": [')
                while chunk := result.fetchmany(2048):
                    if count:
                        temporary.write(",")
                    temporary.write(",".join(json.dumps(row, ensure_ascii=False) for row in chunk))
                    count += len(chunk)
                if not count:
                    raise ValueError("Empty snapshot")
                temporary.write("]}")
            staging.replace(output)
        finally:
            staging.unlink(missing_ok=True)
    print(f"{release} {country}: {count} address rows with websites", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release")
    parser.add_argument("output", type=Path)
    parser.add_argument("--country", type=str.upper, choices=[*BOUNDS, "GB", "US", "FR"], default="DE")
    args = parser.parse_args()
    export(args.release, args.output, args.country)
