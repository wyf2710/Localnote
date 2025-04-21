class NoteEditor {
  constructor() {
    this.editor = document.getElementById('editor');
    this.preview = document.getElementById('preview');
    this.outline = document.getElementById('outline');
    this.titleInput = document.getElementById('titleInput');
    this.categorySelect = document.getElementById('categorySelect');
    this.saveNoteBtn = document.getElementById('saveNoteBtn');
    this.backBtn = document.getElementById('backBtn');
    this.imageBtn = document.getElementById('imageBtn');
    this.imageInput = document.getElementById('imageInput');
    this.newCategoryBtn = document.getElementById('newCategoryBtn');
    this.colorPicker = document.getElementById('colorPicker');
    this.importMd = document.getElementById('importMd');
    this.outlineBtn = document.getElementById('outlineBtn');
    this.backToTop = document.getElementById('backToTop');
    this.isOutlineExpanded = false;

    this.currentNoteId = new URLSearchParams(window.location.search).get('id');

    this.init();
  }

  init() {
    this.loadCategories();
    if (this.currentNoteId) {
      this.loadNote(this.currentNoteId);
    }

    this.editor.addEventListener('input', () => {
      this.updatePreview();
      this.updateOutline();
    });

    this.saveNoteBtn.addEventListener('click', () => this.saveNote());
    this.backBtn.addEventListener('click', () => {
      if (confirm('确定要返回吗？未保存的内容将会丢失')) {
        window.location.href = BASE_URL;
      }
    });
    this.imageBtn.addEventListener('click', () => this.imageInput.click());
    this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
    this.newCategoryBtn.addEventListener('click', () => this.createNewCategory());

    // 工具栏按钮事件
    document.querySelectorAll('.toolbar button[data-command]').forEach(button => {
      button.addEventListener('click', () => {
        this.execCommand(button.dataset.command);
      });
    });

    // 设置默认分类
    this.categorySelect.value = '1'; // 假设 1 是"未分类"的 ID

    // 新增事件监听
    this.colorPicker.addEventListener('change', (e) => {
      this.execCommand('forecolor', e.target.value);
    });

    this.importMd.addEventListener('change', (e) => this.handleImport(e));

    // 目录切换
    this.outlineBtn.addEventListener('click', () => {
      this.isOutlineExpanded = !this.isOutlineExpanded;
      this.outline.classList.toggle('expanded');
      this.outlineBtn.innerHTML = this.isOutlineExpanded ?
        '<i class="fas fa-times"></i>' :
        '<i class="fas fa-list"></i>';
    });

    // 目录项点击
    this.outline.addEventListener('click', (e) => {
      if (e.target.classList.contains('outline-item')) {
        const text = e.target.textContent;
        const headingRegex = new RegExp(`^#{1,6}\\s+${text}`, 'm');
        const match = this.editor.value.match(headingRegex);
        if (match) {
          const position = this.editor.value.indexOf(match[0]);
          // 定位编辑区
          const lines = this.editor.value.substr(0, position).split('\n');
          const lineNumber = lines.length;
          const lineHeight = this.editor.clientHeight / this.editor.value.split('\n').length;
          this.editor.scrollTop = (lineNumber - 1) * lineHeight;

          // 定位预览区
          const level = match[0].match(/^#+/)[0].length;
          const headings = Array.from(this.preview.querySelectorAll(`h${level}`));
          const targetHeading = headings.find(h => h.textContent === text);
          if (targetHeading) {
            targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          // 高亮显示当前标题
          this.preview.querySelectorAll('.heading-active').forEach(el => {
            el.classList.remove('heading-active');
          });
          if (targetHeading) {
            targetHeading.classList.add('heading-active');
            setTimeout(() => {
              targetHeading.classList.remove('heading-active');
            }, 2000);
          }
        }
      }
    });

    // 回到顶部
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        this.backToTop.classList.add('visible');
      } else {
        this.backToTop.classList.remove('visible');
      }
    });

    this.backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // 添加编辑器滚动监听
    this.editor.addEventListener('scroll', () => {
      this.updateOutline();
    });
  }

  async loadCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      const categories = await response.json();

      this.categorySelect.innerHTML = '<option value="">未分类</option>';
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        this.categorySelect.appendChild(option);
      });
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  async loadNote(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`);
      const note = await response.json();

      this.titleInput.value = note.title;
      this.editor.value = note.content;
      this.categorySelect.value = note.category ? String(note.category) : '';

      this.updatePreview();
      this.updateOutline();
    } catch (error) {
      console.error('加载笔记失败:', error);
    }
  }

  async saveNote() {
    const title = this.titleInput.value.trim();
    const content = this.editor.value.trim();

    if (!title) {
      this.showError('标题不能为空');
      this.titleInput.focus();
      return;
    }

    if (!content) {
      this.showError('内容不能为空');
      this.editor.focus();
      return;
    }

    try {
      const method = this.currentNoteId ? 'PUT' : 'POST';
      const url = this.currentNoteId ?
        `${API_BASE_URL}/notes/${this.currentNoteId}` :
        `${API_BASE_URL}/notes`;

      const category = this.categorySelect.value ? String(this.categorySelect.value) : null;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          category
        })
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      window.location.href = BASE_URL;
    } catch (error) {
      console.error('保存笔记失败:', error);
      this.showError('保存失败，请重试');
    }
  }

  updatePreview() {
    const content = this.editor.value;
    this.preview.innerHTML = marked.parse(content);
  }

  updateOutline() {
    const headings = this.editor.value.match(/^#{1,6}\s+.+$/gm) || [];
    const currentPosition = this.editor.scrollTop;
    const lineHeight = this.editor.clientHeight / this.editor.value.split('\n').length;
    const currentLine = Math.floor(currentPosition / lineHeight);

    const outlineHtml = headings.map(heading => {
      const level = heading.match(/^#+/)[0].length;
      const text = heading.replace(/^#+\s+/, '');
      const headingPosition = this.editor.value.indexOf(heading);
      const headingLine = this.editor.value.substr(0, headingPosition).split('\n').length;
      const isActive = Math.abs(headingLine - currentLine) < 3;
      return `<li class="outline-item outline-h${level}${isActive ? ' active' : ''}">${text}</li>`;
    }).join('');

    this.outline.innerHTML = `
      <div class="outline-title">目录</div>
      <ul class="outline-list">${outlineHtml}</ul>
    `;
  }

  execCommand(command, value = null) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const selected = this.editor.value.substring(start, end);

    let insertion = '';
    switch (command) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        insertion = '#'.repeat(parseInt(command[1])) + ' ' + selected;
        break;
      case 'bold':
        insertion = `**${selected}**`;
        break;
      case 'italic':
        insertion = `*${selected}*`;
        break;
      case 'align-left':
        insertion = `::: left\n${selected}\n:::`;
        break;
      case 'align-center':
        insertion = `::: center\n${selected}\n:::`;
        break;
      case 'align-right':
        insertion = `::: right\n${selected}\n:::`;
        break;
      case 'code':
        insertion = `\`\`\`\n${selected}\n\`\`\``;
        break;
      case 'indent':
        insertion = selected.split('\n').map(line => '  ' + line).join('\n');
        break;
      case 'table':
        insertion = `| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |`;
        break;
      case 'forecolor':
        insertion = `<span style="color: ${value}">${selected}</span>`;
        break;
    }

    this.editor.value =
      this.editor.value.substring(0, start) +
      insertion +
      this.editor.value.substring(end);

    this.updatePreview();
    this.updateOutline();
  }

  async handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      this.editor.value = content;
      this.titleInput.value = file.name.replace('.md', '');
      this.updatePreview();
      this.updateOutline();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请重试');
    }
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('上传失败');

      const data = await response.json();
      const imageMarkdown = `![${file.name}](${data.url})`;
      const cursorPos = this.editor.selectionStart;

      this.editor.value =
        this.editor.value.substring(0, cursorPos) +
        imageMarkdown +
        this.editor.value.substring(cursorPos);

      this.updatePreview();
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    }
  }

  async createNewCategory() {
    const name = await this.showDialog('新建分类', '请输入分类名称：');
    if (!name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建分类失败');
      }

      await this.loadCategories();
      this.categorySelect.value = data.id;
    } catch (error) {
      console.error('创建分类失败:', error);
      this.showError('创建分类失败：' + error.message);
    }
  }

  // 辅助方法：显示对话框
  showDialog(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'dialog-overlay';
      dialog.innerHTML = `
        <div class="dialog">
          <h3>${title}</h3>
          <p>${message}</p>
          <input type="text" class="dialog-input">
          <div class="dialog-buttons">
            <button class="btn btn-secondary dialog-cancel">取消</button>
            <button class="btn btn-primary dialog-confirm">确定</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);
      const input = dialog.querySelector('.dialog-input');
      input.focus();

      dialog.querySelector('.dialog-cancel').onclick = () => {
        document.body.removeChild(dialog);
        resolve(null);
      };

      dialog.querySelector('.dialog-confirm').onclick = () => {
        const value = input.value.trim();
        if (value) {
          document.body.removeChild(dialog);
          resolve(value);
        }
      };
    });
  }

  // 辅助方法：显示错误信息
  showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    document.body.appendChild(error);
    setTimeout(() => {
      error.classList.add('fade-out');
      setTimeout(() => document.body.removeChild(error), 300);
    }, 3000);
  }
}

new NoteEditor(); 