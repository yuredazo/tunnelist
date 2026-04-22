# tunnelist

Share a folder over your local network so another PC can browse and sync files from it.

## Usage

Go to the folder you want to share, then run:

```
npx tunnelist
```

That's it. It will print the address to open in the tunnelist desktop app.

## Options

```
npx tunnelist -p 8080   # use a different port (default: 3000)
```

## Notes

- Anyone on your network can access the shared folder, so only use it on trusted networks.
- The folder is read-only — nothing can be uploaded or deleted from the server side.
