const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 搜索笔记
router.get('/search', async (req, res) => {
  const { q, category } = req.query;
  try {
    let sql = `
      SELECT notes.*, categories.name as categoryName 
      FROM notes 
      LEFT JOIN categories ON notes.category = categories.id 
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ' AND title LIKE ?';
      params.push(`%${q}%`);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY updatedAt DESC';

    const [notes] = await db.query(sql, params);
    if (!Array.isArray(notes)) {
      throw new Error('Invalid response format');
    }
    // 处理未分类的情况
    notes.forEach(note => {
      if (!note.categoryName) {
        note.categoryName = '未分类';
      }
      note.category = note.category ? String(note.category) : null;
    });
    res.json(notes);
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: '搜索失败', details: error.message });
  }
});

// 获取单个笔记
router.get('/:id', async (req, res) => {
  try {
    const [notes] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (notes.length === 0) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    res.json(notes[0]);
  } catch (error) {
    console.error('获取笔记失败:', error);
    res.status(500).json({ error: '获取笔记失败' });
  }
});

// 获取所有笔记
router.get('/', async (req, res) => {
  try {
    const [notes] = await db.query(`
      SELECT 
        notes.*, 
        categories.id as category,
        categories.name as categoryName 
      FROM notes 
      LEFT JOIN categories ON notes.category = categories.id 
      ORDER BY notes.updatedAt DESC
    `);

    // 处理未分类的情况
    notes.forEach(note => {
      // 确保 category 字段的类型一致性
      note.category = note.category ? String(note.category) : null;
      if (!note.categoryName) {
        note.categoryName = '未分类';
      }
    });

    console.log('Notes from server:', notes); // 调试日志
    res.json(notes);
  } catch (error) {
    console.error('获取笔记失败:', error);
    res.status(500).json({ error: '获取笔记失败' });
  }
});

// 创建笔记
router.post('/', async (req, res) => {
  const { title, content, category } = req.body;

  // 验证标题和内容
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO notes (title, content, category) VALUES (?, ?, ?)',
      [title.trim(), content.trim(), category]
    );
    res.json({ id: result.insertId });
  } catch (error) {
    console.error('创建笔记失败:', error);
    res.status(500).json({ error: '创建笔记失败' });
  }
});

// 更新笔记
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body;

  // 验证标题和内容
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  try {
    await db.query(
      'UPDATE notes SET title = ?, content = ?, category = ?, updatedAt = NOW() WHERE id = ?',
      [title.trim(), content.trim(), category, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新笔记失败' });
  }
});

// 删除笔记
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM notes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({ error: '删除笔记失败' });
  }
});

module.exports = router; 