// Khởi tạo các biến toàn cục
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("uploadProgress");
const uploadStatus = document.getElementById("uploadStatus");
const uploadSpeed = document.getElementById("uploadSpeed");
let files = [];
let uploadStartTime;

// Xử lý sự kiện kéo thả (Drag & Drop)
class DragAndDrop {
  static init() {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drop-zone-active");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drop-zone-active");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drop-zone-active");
      FileHandler.handleFiles(e.dataTransfer.files);
    });

    // Click để chọn file
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) =>
      FileHandler.handleFiles(e.target.files)
    );

    // Xử lý paste từ clipboard
    document.addEventListener("paste", (e) => {
      const items = e.clipboardData.items;
      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length > 0) {
        e.preventDefault();
        const pastedFiles = imageItems.map((item) => item.getAsFile());
        FileHandler.handleFiles(pastedFiles);
      }
    });
  }
}

// Xử lý file
class FileHandler {
  static handleFiles(newFiles) {
    const validFiles = Array.from(newFiles).filter(this.validateFile);
    files = [...files, ...validFiles];
    PreviewHandler.updatePreview();

    if (validFiles.length > 0) {
      UploadHandler.uploadFiles();
    }
  }

  static validateFile(file) {
    // Kiểm tra định dạng file
    if (!file.type.startsWith("image/")) {
      UIHandler.showNotification(
        `${file.name} không phải là file ảnh`,
        "error"
      );
      return false;
    }

    // Kiểm tra kích thước file (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      UIHandler.showNotification(`${file.name} vượt quá 50MB`, "error");
      return false;
    }

    return true;
  }

  static removeFile(index) {
    files.splice(index, 1);
    PreviewHandler.updatePreview();
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Xử lý preview
class PreviewHandler {
  static updatePreview() {
    preview.innerHTML = "";
    files.forEach((file, index) => {
      const div = document.createElement("div");
      div.className = "preview-item";

      const img = document.createElement("img");
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      reader.readAsDataURL(file);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        FileHandler.removeFile(index);
      };

      const fileInfo = document.createElement("div");
      fileInfo.className = "file-info";
      fileInfo.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">${FileHandler.formatFileSize(
                  file.size
                )}</span>
            `;

      div.appendChild(img);
      div.appendChild(removeBtn);
      div.appendChild(fileInfo);
      preview.appendChild(div);
    });
  }
}

// Xử lý upload
class UploadHandler {
  static uploadFiles() {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => {
      console.log("Preparing to upload file:", file.name);
      formData.append("images", file);
    });

    uploadStartTime = Date.now();
    progressContainer.style.display = "block";

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", this.updateProgress);
    xhr.addEventListener("load", this.handleUploadComplete);
    xhr.addEventListener("error", (e) => {
      console.error("Upload error:", e);
      this.handleUploadError(e);
    });

    xhr.open("POST", "/api/upload", true);
    xhr.send(formData);
  }

  static updateProgress(e) {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressBar.style.width = percentComplete + "%";

      // Tính toán tốc độ upload
      const currentTime = Date.now();
      const elapsedTime = (currentTime - uploadStartTime) / 1000; // seconds
      const bytesPerSecond = e.loaded / elapsedTime;

      uploadStatus.textContent = `${Math.round(percentComplete)}%`;
      uploadSpeed.textContent = `${FileHandler.formatFileSize(
        bytesPerSecond
      )}/s`;
    }
  }

  // Trong class UploadHandler
  static handleUploadComplete(e) {
    try {
      // Thêm log để debug
      console.log("Response from server:", e.target.response);

      const response = JSON.parse(e.target.response);
      if (response.success) {
        UIHandler.showNotification("Upload thành công!", "success");
        UploadHandler.resetUpload();
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        UIHandler.showNotification(
          response.message || "Upload thất bại!",
          "error"
        );
      }
    } catch (error) {
      console.error("Error parsing response:", error);
      console.error("Raw response:", e.target.response);
      UIHandler.showNotification("Có lỗi xảy ra khi xử lý response", "error");
    }
  }

  static handleUploadError() {
    UIHandler.showNotification("Lỗi kết nối khi upload", "error");
  }

  static resetUpload() {
    files = [];
    preview.innerHTML = "";
    progressBar.style.width = "0%";
    uploadStatus.textContent = "0%";
    uploadSpeed.textContent = "";
    progressContainer.style.display = "none";
    fileInput.value = "";
  }
}

// Xử lý UI
class UIHandler {
  static showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", () => {
  DragAndDrop.init();
});
