import React, { useState } from 'react';

const EditBookModal = ({ book, onSave, onCancel }) => {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [publisher, setPublisher] = useState(book.publisher);

  const handleSave = () => {
    onSave(book.id, { title, author, publisher });
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Edit Book</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          type="text"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
        />
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default EditBookModal;
