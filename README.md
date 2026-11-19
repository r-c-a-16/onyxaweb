# Onyxa

A lightweight, open-source web application for deploying and managing websites through GitHub Pages.

Onyxa allows users to create repositories, upload website files, manage project files, and publish websites directly from their browser using a personal GitHub access token.

Built with vanilla HTML, CSS, and JavaScript, with no backend, build process, or external dependencies.

## Features

- **Multi-Account Support:** Manage multiple GitHub accounts and switch between them.
- **PIN Protection:** Encrypt locally stored sensitive data using AES-GCM.
- **Deployment Wizard:** Create repositories, upload files, and configure GitHub Pages.
- **File Management:** Create, edit, rename, and delete files and directories.
- **ZIP Import:** Upload complete website projects using ZIP archives.
- **Live Preview:** Preview websites before and after deployment.
- **Build Monitoring:** Monitor GitHub Pages build and deployment status.
- **Version Restore:** Restore previous versions of deployed websites.

## Interface

- Arabic and English language support.
- Full right-to-left (RTL) layout support.
- Responsive desktop and mobile interface.
- Light and dark themes.

## Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub REST API
- Web Crypto API
- Browser Storage API

## Privacy and Security

Onyxa operates entirely within the browser and does not require a dedicated backend.

- Application data is stored locally in the browser.
- GitHub API requests are sent directly to `api.github.com`.
- Optional PIN protection encrypts locally stored sensitive data using AES-GCM.
- Fine-grained GitHub Personal Access Tokens are recommended.
- Use only the permissions required for repository and GitHub Pages management.

**Security Notice:** Never share your GitHub access token. Avoid using Onyxa on shared or untrusted devices.

## Getting Started

### Requirements

- A modern web browser.
- A GitHub account.
- A GitHub Personal Access Token with the required permissions.

### Installation

1. Clone or download this repository.
2. Extract the project files if downloaded as an archive.
3. Open `index.html` in your browser.

Alternatively, run a local development server:

```bash
python3 -m http.server 8080
```

Open the following address in your browser:

```text
http://localhost:8080
```

### Usage

1. Open Onyxa.
2. Add your GitHub Personal Access Token.
3. Create a deployment.
4. Upload website files or import a ZIP archive.
5. Configure GitHub Pages.
6. Publish your website.

## Project Structure

```text
Onyxa/
├── index.html
├── style.css
├── app.js
├── README.md
└── LICENSE
```

| File | Description |
|---|---|
| `index.html` | Main application interface |
| `style.css` | Application styles and themes |
| `app.js` | Application logic and functionality |
| `README.md` | Project documentation |
| `LICENSE` | MIT License |

## Contributing

Contributions are welcome.

You can contribute by:

- Reporting bugs.
- Suggesting improvements.
- Requesting new features.
- Submitting pull requests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Onyxa** — Simplifying website deployment with GitHub Pages.