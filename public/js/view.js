class NoteViewer {
  constructor() {
    this.viewContent = document.getElementById('viewContent');
    this.viewHeader = document.querySelector('.view-header');
    this.noteId = new URLSearchParams(window.location.search).get('id');

    this.init();
  }

  async init() {
    if (this.noteId) {
      await this.loadNote(this.noteId);
    }

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        this.viewHeader.classList.add('scrolled');
      } else {
        this.viewHeader.classList.remove('scrolled');
      }
    });
  }

  async loadNote(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`);
      const note = await response.json();

      // 处理内容中的图片路径
      let content = note.content;
      content = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        // 如果是相对路径，添加基础路径
        if (!src.startsWith('http') && !src.startsWith('/')) {
          src = `/res/${src}`;
        }
        return `![${alt}](${src})`;
      });

      this.viewContent.innerHTML = `
        <h1 class="note-title">${note.title}</h1>
        <div class="note-meta">
          <span class="category">${note.categoryName || '未分类'}</span>
          <span class="time">${new Date(note.updatedAt).toLocaleString()}</span>
        </div>
        <div class="note-body markdown-preview">
          ${marked.parse(content)}
        </div>
      `;
    } catch (error) {
      console.error('加载笔记失败:', error);
      this.viewContent.innerHTML = '<div class="error">加载笔记失败</div>';
    }
  }
}

new NoteViewer(); 