"""Exercise the real DuckDB export without downloading a release."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import duckdb

spec = importlib.util.spec_from_file_location("exporter", Path(__file__).with_name("export-overture-agencies.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ExportTest(unittest.TestCase):
    def test_multi_address_place_and_atomic_replacement(self):
        with TemporaryDirectory() as directory:
            parquet = Path(directory) / "places.parquet"
            with duckdb.connect() as db:
                db.execute("""copy (select 'x' as id, {'primary':'Agentur'} names,
                    {'primary':'marketing_agency'} taxonomy, ['https://agency.example'] websites,
                    [{'locality':'Wien','country':'AT','postcode':'1010','region':'Wien'},
                     {'locality':'Berlin','country':'DE','postcode':'10115','region':'Berlin'}] addresses,
                    [{'dataset':'fixture'}] sources, {'xmin':13.0,'ymin':48.0} bbox,
                    'open' operating_status) to ? (format parquet)""", [str(parquet)])
            def stac(url):
                if url.endswith("collection.json"):
                    return {"links":[{"rel":"item","href":"one"}]}
                return {"bbox":[10,47,16,52],"assets":{"aws":{"href":str(parquet)}}}
            with patch.object(exporter,"get_json",stac):
                out = Path(directory) / "snapshot.json"
                for country,city in [("AT","Wien"),("DE","Berlin")]:
                    exporter.export("2026-11-18.0",out,country)
                    data = json.loads(out.read_text(encoding="utf8"))
                    self.assertEqual(data["country"],country)
                    self.assertEqual(len(data["rows"]),1)
                    self.assertEqual(data["rows"][0][4],city)
                    self.assertEqual(data["rows"][0][8:],[13.0,48.0])
                saved = out.read_bytes()
                with self.assertRaisesRegex(ValueError,"Empty snapshot"):
                    exporter.export("2026-11-18.0",out,"CZ")
                self.assertEqual(out.read_bytes(),saved)


if __name__ == "__main__":
    unittest.main()
