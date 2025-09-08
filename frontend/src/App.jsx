import React, { useState, useEffect } from 'react';
import axiosInstance from './api';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import EditBookModal from './components/EditBookModal';
import ImageCropModal from './components/ImageCropModal';
import { Oval } from 'react-loader-spinner';

const Loader = () => (
  <div className="loader">
    <Oval color="#00BFFF" height={80} width={80} />
  </div>
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [editingBook, setEditingBook] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total_pages: 1,
  });
  const [croppingImage, setCroppingImage] = useState(null);

  useEffect(() => {
    if (token) {
      fetchAllBooks();
    }
  }, [token, pagination.page]);

  const fetchAllBooks = async () => {
    setStatus('loading');
    try {
      const response = await axiosInstance.get(`/api/books?page=${pagination.page}&per_page=${pagination.per_page}`);
      setBooks(response.data.books);
      setPagination(prev => ({
        ...prev,
        total_pages: response.data.total_pages,
      }));
      setStatus('idle');
    } catch (error) {
      console.error('Error fetching books:', error);
      handleError('Error fetching books.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const response = await axiosInstance.get(`/api/books/search?q=${searchQuery}&page=${pagination.page}&per_page=${pagination.per_page}`);
      setBooks(response.data.books);
      setPagination(prev => ({
        ...prev,
        total_pages: response.data.total_pages,
      }));
      setStatus('idle');
    } catch (error) {
      console.error('Error searching books:', error);
      handleError('Error searching books.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCroppingImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = async (croppedImageBlob) => {
    setCroppingImage(null);
    const formData = new FormData();
    formData.append('file', croppedImageBlob, 'cropped_image.jpeg');

    setStatus('loading');
    setMessage('Uploading and processing image...');

    try {
      const response = await axiosInstance.post('/api/books/index', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      handleSuccess(response.data.message);
      fetchAllBooks(); // Refresh the book list
    } catch (error) {
      console.error('Error uploading file:', error);
      handleError('Error uploading file.');
    }
  };

  const handleCancelCrop = () => {
    setCroppingImage(null);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  const handleEdit = (book) => {
    setEditingBook(book);
  };

  const handleCancelEdit = () => {
    setEditingBook(null);
  };

  const handleSaveEdit = async (bookId, updatedBook) => {
    setStatus('loading');
    try {
      await axiosInstance.put(`/api/books/${bookId}`, updatedBook);
      setEditingBook(null);
      handleSuccess('Book updated successfully.');
      fetchAllBooks();
    } catch (error) {
      console.error('Error updating book:', error);
      handleError('Error updating book.');
    }
  };

  const handleDelete = async (bookId) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      setStatus('loading');
      try {
        await axiosInstance.delete(`/api/books/${bookId}`);
        handleSuccess('Book deleted successfully.');
        fetchAllBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
        handleError('Error deleting book.');
      }
    }
  };

  const handleSuccess = (msg) => {
    setMessage(msg);
    setStatus('success');
    setTimeout(() => {
      setMessage('');
      setStatus('idle');
    }, 3000);
  };

  const handleError = (msg) => {
    setMessage(msg);
    setStatus('error');
    setTimeout(() => {
      setMessage('');
      setStatus('idle');
    }, 3000);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (!token) {
    return (
      <div className="App">
        {isRegistering ? (
          <Register />
        ) : (
          <Login setToken={setToken} />
        )}
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Switch to Login' : 'Switch to Register'}
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      {status === 'loading' && <Loader />}
      <header className="App-header">
        <h1>Book Inventory</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        <div className="upload-section card">
          <h2>Upload a picture of your books</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="search-section card">
          <h2>Search for a book</h2>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or author"
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {message && <div className={`status-message ${status}`}>{message}</div>}

        <div className="book-list card">
          <h2>Your Books</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Publisher</th>
                <th>Source Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.publisher}</td>
                  <td>{book.source_image}</td>
                  <td>
                    <button onClick={() => handleEdit(book)}>Edit</button>
                    <button onClick={() => handleDelete(book.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages}
            >
              Next
            </button>
          </div>
        </div>

        {editingBook && (
          <EditBookModal
            book={editingBook}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {croppingImage && (
          <ImageCropModal
            image={croppingImage}
            onCropComplete={handleCropComplete}
            onCancel={handleCancelCrop}
          />
        )}
      </main>
    </div>
  );
}

export default App;