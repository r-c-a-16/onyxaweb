# Onyxa

Onyxa is a lightweight, open-source web app that lets you deploy websites to GitHub Pages directly from your browser, using your own GitHub personal access token. It is built with plain HTML, CSS and vanilla JavaScript: no backend, no build step, and no third-party dependencies.

The interface is bilingual (Arabic and English) with full right-to-left support, and works on both desktop and mobile, in light and dark themes.

## Features

- **Multi-account support:** save several GitHub accounts and switch between them.
- **Optional PIN lock:** stored data is encrypted on your device with AES-GCM.
- **Deploy wizard:** create a repository, upload your files and enable GitHub Pages step by step.
- **File manager:** add, edit, rename and delete files and folders.
- **ZIP import:** upload a whole site as a ZIP archive.
- **Live preview:** check your site before and after publishing.
- **Build monitoring:** follow the GitHub Pages build status.
- **Version restore:** roll back to a previous version of your site.

## Privacy and security

- Everything runs locally in your browser.
- Your token is sent only to `api.github.com`, never to any other server.
- Use a fine-grained personal access token limited to the repositories you need (Contents and Pages read/write).
- Enable the PIN lock to encrypt the stored token on your device.
- Do not use Onyxa on a shared or untrusted computer.

## Getting started

1. Download the repository files into one folder.
2. Open `index.html` in a browser, or serve the folder with any static server:

   ```bash
   python3 -m http.server 8080
   ```

3. Add your GitHub token.
4. Create a deployment, upload your files or a ZIP, and publish.

## Project files

```
index.html    Entry point
style.css     Styles
app.js        Application logic
logo.png      Logo and favicon
README.md     Documentation
LICENSE       MIT License
```

## Contributing

Issues and pull requests are welcome.

## License

Released under the [MIT License](LICENSE).
