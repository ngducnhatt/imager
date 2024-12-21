const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Cấu hình EJS và middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình multer để xử lý upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file độc nhất với timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
    // Chấp nhận chỉ image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
};

// Cấu hình upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // Giới hạn 50MB
    }
});

// Route cho trang chủ (gallery)
app.get('/', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error reading uploads directory:', err);
            return res.render('index', { images: [] });
        }

        // Lọc ra các file ảnh và sắp xếp theo thời gian mới nhất
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => {
                const stats = fs.statSync(path.join(uploadDir, file));
                return { name: file, time: stats.mtime.getTime() };
            })
            .sort((a, b) => b.time - a.time)
            .map(file => file.name);

        res.render('index', { images });
    });
});

// Route cho trang upload
app.get('/upload', (req, res) => {
    res.render('upload');
});

// API endpoint cho việc upload ảnh
app.post('/api/upload', upload.array('images'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có file nào được upload'
            });
        }

        // Trả về thành công
        res.json({
            success: true,
            message: 'Upload thành công!',
            files: req.files.map(file => file.filename)
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Có lỗi xảy ra khi upload file'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File quá lớn. Giới hạn là 50MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Lỗi upload: ${err.message}`
        });
    }

    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});