const express = require('express');
const path = require('path');
const notesRouter = require('./routes/notes');
const uploadRouter = require('./routes/upload');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 添加资源文件目录
app.use('/res', express.static(path.join(__dirname, '../public/res')));

// 添加安全头
app.use((req, res, next) => {
  res.header('Content-Security-Policy', `
    default-src 'self';
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    img-src 'self' data: https: http://localhost:* http://127.0.0.1:*;
    connect-src 'self';
    font-src 'self' data: https://cdn.jsdelivr.net
  `.replace(/\s+/g, ' ').trim());
  next();
});

// 添加 CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 首先处理静态文件
app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());

// API 路由
app.use('/api/notes', notesRouter);
app.use('/api/upload', uploadRouter);

// 添加分类路由
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    res.json(categories);
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 新建分类路由
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    );

    res.json({
      id: result.insertId,
      name
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 处理编辑页面路由
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/editor.html'));
});

// 处理查看页面路由
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/view.html'));
});

// 处理主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 