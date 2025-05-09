# Rule35 - Multi-API Image Aggregator

<div align="center">

📸 A modern, feature-rich image aggregator that seamlessly integrates multiple image board APIs into a beautiful, responsive interface.

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

## ✨ Features

- 🖼️ **Multi-API Support**

  - Rule34
  - Danbooru
  - Yande.re
  - Konachan
  - Gelbooru
  - Waifu.pics

- 🔍 **Advanced Search Capabilities**

  - Real-time tag autocomplete for Rule34
  - Similar image search based on tags
  - Smart tag processing and filtering

- 🎨 **Modern User Interface**

  - Responsive image grid layout
  - Smooth animations powered by GSAP
  - Toast notifications for user feedback
  - Custom styled dropdown menus
  - Dark theme optimized

- 🚀 **Performance Features**

  - Infinite scroll with lazy loading
  - Image lazy loading
  - Optimized API requests
  - Smart proxy handling for CORS

- ⚡ **Enhanced User Experience**
  - One-click image downloads
  - Quick similar image search
  - Automatic tag suggestions
  - Keyboard navigation support
  - ARIA-compliant for accessibility

## 🛠️ Technologies Used

- Vanilla JavaScript (ES6+)
- GSAP (GreenSock Animation Platform)
- CSS3 with Grid and Flexbox
- Intersection Observer API
- Custom-built API integrations

## 🚀 Getting Started

### Prerequisites

- A modern web browser
- A web server (local or hosted)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/iam-sahil/rule35.git
```

2. Navigate to the project directory:

```bash
cd rule35
```

3. Serve the files using any web server of your choice. For example, using Python's built-in server:

```bash
python -m http.server 8000
```

4. Open your browser and navigate to `http://localhost:8000`

## 📝 API Integration

The project integrates with multiple image board APIs:

- **Rule34**: Full search and autocomplete support
- **Danbooru**: Image search with tag filtering
- **Yande.re**: Image search with proxy support
- **Konachan**: Full image search capabilities
- **Gelbooru**: Tag-based image search
- **Waifu.pics**: Random image generation

Each API is normalized through a custom interface to provide consistent data across the application.

## 🔧 Configuration

API endpoints can be configured in the `script.js` file. The application uses a proxy service for APIs that require CORS handling.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- GSAP for the amazing animation library
- All the image board APIs for their services
- The open-source community for inspiration and support

---

<div align="center">
Made with ❤️ by [Your Name]
</div>
