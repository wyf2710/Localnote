class NoteSearch {
  constructor() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.categoryList = document.getElementById('categoryList');
    this.noteContent = document.getElementById('noteContent');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.categories = new Map(); // 存储分类及其笔记

    this.init();
  }

  init() {
    this.searchBtn.addEventListener('click', () => {
      this.performSearch();
    });

    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    this.searchInput.addEventListener('input', () => {
      if (!this.searchInput.value.trim()) {
        this.loadCategories();
      }
    });

    this.newNoteBtn.addEventListener('click', () => {
      window.location.href = `${BASE_URL}/editor`;
    });

    this.loadCategories();
  }

  async loadCategories() {
    try {
      const [categoriesResponse, notesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/notes`)
      ]);

      const categories = await categoriesResponse.json();
      const notes = await notesResponse.json();

      // 清空现有分类
      this.categories.clear();

      // 按更新时间排序
      notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      this.latestNote = notes[0];

      // 获取未分类笔记
      const unclassifiedNotes = notes.filter(note => {
        return !note.category || note.category === 'null' || note.category === null;
      });

      // 添加未分类选项
      if (unclassifiedNotes.length > 0) {
        this.categories.set('null', {
          id: null,
          name: '未分类',
          notes: unclassifiedNotes.map(note => ({
            ...note,
            categoryName: '未分类'
          }))
        });
      }

      // 按分类组织笔记
      categories.forEach(category => {
        const categoryNotes = notes.filter(note =>
          String(note.category) === String(category.id)
        );
        if (categoryNotes.length > 0) {
          this.categories.set(category.id, {
            ...category,
            notes: categoryNotes.map(note => ({
              ...note,
              categoryName: category.name
            }))
          });
        }
      });

      this.renderMenuList();

      // 如果有最新笔记，展开其所在分类并显示内容
      if (this.latestNote) {
        const categoryId = this.latestNote.category ? String(this.latestNote.category) : 'null';
        const categoryElement = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (categoryElement) {
          categoryElement.classList.add('expanded');
          categoryElement.querySelector('.submenu').classList.add('expanded');
          this.showNoteDetail(this.latestNote);
        }
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  renderMenuList() {
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = '';

    // 渲染第一级菜单
    this.categories.forEach((category, categoryId) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.dataset.categoryId = categoryId;

      menuItem.innerHTML = `
        <div class="menu-level-1">
          <div class="menu-title">
            <i class="fas fa-folder menu-icon"></i>
            <span>${category.name}</span>
            <span class="note-count">(${category.notes.length})</span>
          </div>
          <i class="fas fa-chevron-right expand-icon"></i>
        </div>
        <div class="submenu">
          ${category.notes.map(note => `
            <div class="menu-level-2" data-note-id="${note.id}">
              <i class="fas fa-file-alt menu-icon"></i>
              <span class="note-title">${note.title}</span>
            </div>
          `).join('')}
        </div>
      `;

      // 添加点击事件
      const menuHeader = menuItem.querySelector('.menu-level-1');
      menuHeader.addEventListener('click', () => {
        // 切换展开状态
        menuItem.classList.toggle('expanded');
        menuItem.querySelector('.submenu').classList.toggle('expanded');
      });

      // 添加笔记点击事件
      menuItem.querySelectorAll('.menu-level-2').forEach(noteItem => {
        noteItem.addEventListener('click', (e) => {
          // 移除其他笔记的选中状态
          document.querySelectorAll('.menu-level-2.active').forEach(el => {
            el.classList.remove('active');
          });

          // 添加选中状态
          noteItem.classList.add('active');

          // 移除所有一级菜单的选中状态
          document.querySelectorAll('.menu-level-1.active').forEach(el => {
            el.classList.remove('active');
          });

          // 给当前笔记的父级菜单添加选中状态
          const parentMenu = noteItem.closest('.menu-item').querySelector('.menu-level-1');
          parentMenu.classList.add('active');

          // 显示笔记内容
          const noteId = noteItem.dataset.noteId;
          const note = category.notes.find(n => String(n.id) === String(noteId));
          if (note) {
            console.log('Found note:', note); // 调试日志
            this.showNoteDetail(note);
          } else {
            console.log('Note not found:', noteId); // 调试日志
            console.log('Available notes:', category.notes); // 调试日志
          }
        });
      });

      menuList.appendChild(menuItem);
    });
  }

  showNoteDetail(note) {
    // 添加淡出效果
    this.noteContent.style.opacity = '0';

    // 短暂延迟后更新内容并淡入
    setTimeout(() => {
      // 处理内容中的图片路径
      let content = note.content;
      content = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        // 如果是相对路径，添加基础路径
        if (!src.startsWith('http') && !src.startsWith('/')) {
          src = `/res/${src}`;
        }
        return `![${alt}](${src})`;
      });

      this.noteContent.innerHTML = `
        <div class="note-header">
          <div class="note-header-top">
            <button class="view-detail-btn" onclick="window.location.href='${BASE_URL}/view?id=${note.id}'">
              <i class="fas fa-expand"></i> 仔细查看
            </button>
          </div>
          <h1>${note.title}</h1>
          <div class="note-meta">
            <span class="category">${note.categoryName || '未分类'}</span>
            <span class="time">${new Date(note.updatedAt).toLocaleString()}</span>
          </div>
          <div class="note-actions">
            <button class="edit-btn" onclick="window.location.href='${BASE_URL}/editor?id=${note.id}'">编辑</button>
            <button class="delete-btn" onclick="noteSearch.deleteNote('${note.id}')">删除</button>
          </div>
        </div>
        <div class="note-body markdown-preview">
          ${marked.parse(content)}
        </div>
      `;
      this.noteContent.style.opacity = '1';

      // 滚动到顶部
      this.noteContent.scrollTop = 0;
    }, 150);
  }

  async performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.loadCategories();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/notes/search?q=${query}`);
      if (!response.ok) {
        throw new Error(`搜索失败: ${response.status}`);
      }
      const notes = await response.json();
      if (!Array.isArray(notes)) {
        throw new Error('Invalid response format');
      }

      // 清空分类列表，显示搜索结果
      this.menuList.innerHTML = `
        <div class="search-results">
          <div class="menu-level-1">
            <div class="menu-title">
              <i class="fas fa-search menu-icon"></i>
              <span>搜索结果</span>
              <span class="note-count">(${notes.length})</span>
            </div>
          </div>
          <div class="submenu expanded">
            ${notes.length > 0 ? notes.map(note => `
              <div class="menu-level-2" onclick="noteSearch.showNoteDetail(${JSON.stringify(note)})">
                <i class="fas fa-file-alt menu-icon"></i>
                <span class="note-title">${note.title}</span>
              </div>
            `).join('') : '<div class="no-results">没有找到匹配的笔记</div>'}
          </div>
        </div>
      `;

      if (notes.length === 0) {
        this.noteContent.innerHTML = '<div class="no-results">没有找到匹配的笔记</div>';
        return;
      }

      // 添加点击事件
      this.menuList.querySelectorAll('.menu-level-2').forEach(noteItem => {
        noteItem.addEventListener('click', () => {
          // 移除其他笔记的选中状态
          document.querySelectorAll('.menu-level-2.active').forEach(el => {
            el.classList.remove('active');
          });
          // 添加选中状态
          noteItem.classList.add('active');
        });
      });

      // 显示第一个笔记
      this.showNoteDetail(notes[0]);
      const firstNoteItem = this.menuList.querySelector('.menu-level-2');
      if (firstNoteItem) {
        firstNoteItem.classList.add('active');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      this.menuList.innerHTML = `
        <div class="search-results">
          <div class="menu-level-1">
            <div class="menu-title">
              <i class="fas fa-exclamation-circle menu-icon"></i>
              <span>搜索失败</span>
            </div>
          </div>
        </div>
      `;
      this.noteContent.innerHTML = '<div class="error">搜索失败，请重试</div>';
    }
  }

  async deleteNote(id) {
    if (!confirm('确定要删除这个笔记吗？')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('删除失败');

      this.loadCategories();
    } catch (error) {
      console.error('删除笔记失败:', error);
      alert('删除失败，请重试');
    }
  }
}

const noteSearch = new NoteSearch(); 