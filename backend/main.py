import os
import sqlite3
import google.generativeai as genai
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager

load_dotenv()

# --- CONFIGURATION ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    GOOGLE_API_KEY = "AIzaSyBfdqUl4zurX9eaj7NrqZiw0ACT9_0aH4k"

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

DATABASE = 'books.db'
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

PROMPT_TEMPLATE = """
Analyseer de bijgevoegde afbeelding van boekenruggen.

Voor elk herkenbaar boek, extraheer de volgende informatie:
- Titel
- Auteur(s)
- Uitgever

Retourneer de informatie als een enkele tekst in CSV-formaat.
Gebruik voor elk boek een aparte regel, waarbij de velden worden gescheiden door een puntkomma (;).
Gebruik het volgende formaat:
"Titel";"Auteur(s)";"Uitgever"
Als een veld niet herkenbaar is, vul dan "N/A" in.
Maak de CSV-tekst zo compact en leesbaar mogelijk.  Geef alleen de CSV data terug, zonder extra uitleg.
"""

# --- FLASK APP ---
app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "super-secret")  # Change this!
jwt = JWTManager(app)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- DATABASE FUNCTIONS ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# --- GEMINI API FUNCTION ---
def extract_books_from_image(image_path):
    try:
        img = Image.open(image_path)
        response = model.generate_content([PROMPT_TEMPLATE, img])
        ruwe_data = response.text.strip()

        if not ruwe_data:
            return []

        csv_regels = [regel.strip() for regel in ruwe_data.split('\n') if regel.strip()]
        books = []
        for regel in csv_regels:
            try:
                row = [veld.strip().replace('"', '') for veld in regel.split(';')]
                while len(row) < 3:
                    row.append("N/A")
                books.append({"title": row[0], "author": row[1], "publisher": row[2]})
            except Exception:
                pass
        return books
    except Exception as e:
        print(f"Error processing image with Gemini: {e}")
        return []

# --- AUTHENTICATION ENDPOINTS ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password'].encode('utf-8')
    hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())

    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"msg": "Username already exists"}), 409
    finally:
        conn.close()

    return jsonify({"msg": "User created"}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password'].encode('utf-8')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()

    if user and bcrypt.checkpw(password, user['password']):
        access_token = create_access_token(identity=user['id'])
        return jsonify(access_token=access_token)

    return jsonify({"msg": "Bad username or password"}), 401

# --- BOOK ENDPOINTS ---
@app.route('/api/books/index', methods=['POST'])
@jwt_required()
def index_books():
    current_user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        books = extract_books_from_image(filepath)

        if not books:
            return jsonify({"message": "No books found in image."}), 200

        conn = get_db_connection()
        c = conn.cursor()
        for book in books:
            c.execute(
                "INSERT INTO books (title, author, publisher, source_image, user_id) VALUES (?, ?, ?, ?, ?)",
                (book['title'], book['author'], book['publisher'], filename, current_user_id)
            )
        conn.commit()
        conn.close()

        return jsonify({"message": f"{len(books)} books indexed successfully."}), 201

@app.route('/api/books', methods=['GET'])
# @jwt_required()
def get_books():
    # current_user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    conn = get_db_connection()
    
    total_books_query = conn.execute('SELECT COUNT(*) FROM books').fetchone()
    total_books = total_books_query[0] if total_books_query else 0
    
    books = conn.execute(
        'SELECT * FROM books ORDER BY id DESC LIMIT ? OFFSET ?',
        (per_page, offset)
    ).fetchall()
    
    conn.close()

    total_pages = (total_books + per_page - 1) // per_page

    return jsonify({
        'books': [dict(ix) for ix in books],
        'total_books': total_books,
        'total_pages': total_pages,
        'current_page': page,
        'per_page': per_page
    })

@app.route('/api/books/search', methods=['GET'])
@jwt_required()
def search_books():
    current_user_id = get_jwt_identity()
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    conn = get_db_connection()

    total_books_query = conn.execute(
        "SELECT COUNT(*) FROM books WHERE user_id = ? AND (title LIKE ? OR author LIKE ?)",
        (current_user_id, f'%{query}%', f'%{query}%')
    ).fetchone()
    total_books = total_books_query[0] if total_books_query else 0

    books = conn.execute(
        "SELECT * FROM books WHERE user_id = ? AND (title LIKE ? OR author LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?",
        (current_user_id, f'%{query}%', f'%{query}%', per_page, offset)
    ).fetchall()
    
    conn.close()

    total_pages = (total_books + per_page - 1) // per_page

    return jsonify({
        'books': [dict(ix) for ix in books],
        'total_books': total_books,
        'total_pages': total_pages,
        'current_page': page,
        'per_page': per_page
    })

@app.route('/api/books/<int:book_id>', methods=['PUT'])
@jwt_required()
def update_book(book_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    title = data['title']
    author = data['author']
    publisher = data['publisher']

    conn = get_db_connection()
    # check if the book belongs to the user
    book = conn.execute('SELECT * FROM books WHERE id = ? AND user_id = ?', (book_id, current_user_id)).fetchone()
    if book is None:
        conn.close()
        return jsonify({"msg": "Book not found or not authorized"}), 404

    conn.execute(
        'UPDATE books SET title = ?, author = ?, publisher = ? WHERE id = ?',
        (title, author, publisher, book_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"msg": "Book updated"})

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
def delete_book(book_id):
    current_user_id = get_jwt_identity()
    conn = get_db_connection()
    # check if the book belongs to the user
    book = conn.execute('SELECT * FROM books WHERE id = ? AND user_id = ?', (book_id, current_user_id)).fetchone()
    if book is None:
        conn.close()
        return jsonify({"msg": "Book not found or not authorized"}), 404

    conn.execute('DELETE FROM books WHERE id = ?', (book_id,))
    conn.commit()
    conn.close()
    return jsonify({"msg": "Book deleted"})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
