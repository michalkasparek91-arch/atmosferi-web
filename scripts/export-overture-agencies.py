"""Export German agency websites for the municipal collector. Requires DuckDB with httpfs."""

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


def export(release, output):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", release):
        raise ValueError("Expected YYYY-MM-DD.N release")
    collection = f"https://stac.overturemaps.org/{release}/places/place/collection.json"
    links = [urljoin(collection, link["href"]) for link in get_json(collection)["links"] if link["rel"] == "item"]
    files = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for item in pool.map(get_json, links):
            west, south, east, north = item["bbox"]
            if west <= 15.1 and east >= 5.8 and south <= 55.1 and north >= 47.2:
                files.append(item["assets"]["aws"]["href"])
    if not files:
        raise ValueError("No intersecting Places partitions")
    with duckdb.connect() as db:
        db.execute("set threads=3")
        rows = db.execute("""
            with candidates as materialized (
                select id, names.primary as title, taxonomy.primary as category, websites, addresses,
                       list_distinct(list_transform(sources, lambda s: s.dataset)) as datasets
                from read_parquet(?)
                where bbox.xmin between 5.8 and 15.1 and bbox.ymin between 47.2 and 55.1
                  and len(websites)>0 and operating_status is distinct from 'permanently_closed'
                  and taxonomy.primary in ('advertising_agency','internet_marketing_service','marketing_agency','public_relations')
            )
            select id, title, category, websites, a.locality, datasets
            from candidates, unnest(addresses) as address(a)
            where upper(a.country)='DE' and a.locality is not null
            order by id, a.locality
        """, [files]).fetchall()
    if not rows:
        raise ValueError("Empty snapshot")
    output.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(mode="w", encoding="utf8", dir=output.parent, delete=False) as temporary:
        json.dump({"release": release, "rows": rows}, temporary, ensure_ascii=False)
    Path(temporary.name).replace(output)
    print(f"{release}: {len(rows)} German listings with websites", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    export(args.release, args.output)
