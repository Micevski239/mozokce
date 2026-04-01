# Study Flashcards

## Qt Desktop App

```bash
cd /Users/filipmicevski/Desktop/mozokce
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 qt_app.py
```

## Legacy CustomTkinter App

```bash
cd /Users/filipmicevski/Desktop/mozokce
source venv/bin/activate
python3 app.py
```

## Notes

- `qt_app.py` is the new PySide6 desktop UI.
- `app.py` remains as the older CustomTkinter version.
- Both versions use the same subject folders and JSON progress files.
