class Editor {
  constructor() {
    this.editor = document.getElementById('editor');
    this.preview = document.getElementById('preview');
    this.titleInput = document.getElementById('titleInput');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.currentNoteId = null;

    this.init();
  }

  init() {
    // 实时预览
    this.editor.addEventListener('input', () => {
      this.updatePreview();
      this.autoSave();
    });

    // 自动保存
    this.titleInput.addEventListener('input', () => {
      this.autoSave();
    });

    // 新建笔记
    this.newNoteBtn.addEventListener('click', () => {
      this.createNewNote();
    });
  }

  async createNewNote() {
    try {
      const newNote = {
        title: '新笔记',
        content: '',
        category: '未分类',
        tags: []
      };

      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNote)
      });

      if (!response.ok) {
        throw new Error('创建笔记失败');
      }

      const result = await response.json();

      // 清空编辑器
      this.currentNoteId = result.id;
      this.titleInput.value = newNote.title;
      this.editor.value = '';
      this.preview.innerHTML = '';

      // 刷新笔记列表
      noteSearch.loadNotes();

      // 聚焦标题输入框
      this.titleInput.focus();
      this.titleInput.select();

    } catch (error) {
      console.error('创建新笔记失败:', error);
      alert('创建新笔记失败，请重试');
    }
  }

  updatePreview() {
    const content = this.editor.value;
    this.preview.innerHTML = marked.parse(content);
  }

  async autoSave() {
    if (!this.currentNoteId) return;

    const note = {
      id: this.currentNoteId,
      title: this.titleInput.value,
      content: this.editor.value,
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/notes/${this.currentNoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(note)
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }

  loadNote(note) {
    this.currentNoteId = note.id;
    this.titleInput.value = note.title;
    this.editor.value = note.content;
    this.updatePreview();
  }
}

const editor = new Editor(); 