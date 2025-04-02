from flask import render_template, url_for, flash, redirect, request, jsonify, abort
from flask_login import login_user, logout_user, current_user, login_required
from sqlalchemy import or_
from app import app, db
from models import User, Post, Category
import logging
from datetime import datetime

# Home page route
@app.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    posts = Post.query.order_by(Post.created_at.desc()).paginate(page=page, per_page=5)
    categories = Category.query.all()
    return render_template('index.html', posts=posts, categories=categories)

# Individual post route
@app.route('/post/<int:post_id>')
def post(post_id):
    post = Post.query.get_or_404(post_id)
    return render_template('post.html', post=post)

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid username or password', 'danger')
            return redirect(url_for('login'))
        
        login_user(user)
        next_page = request.args.get('next')
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('index')
        return redirect(next_page)
    
    return render_template('login.html')

# Registration route
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash('Username already taken', 'danger')
            return redirect(url_for('register'))
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'danger')
            return redirect(url_for('register'))
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        # Make the first user an admin
        if User.query.count() == 0:
            user.is_admin = True
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# Logout route
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# Admin panel
@app.route('/admin')
@login_required
def admin():
    if not current_user.is_admin:
        abort(403)
    
    posts = Post.query.order_by(Post.created_at.desc()).all()
    categories = Category.query.all()
    users = User.query.all()
    return render_template('admin.html', posts=posts, categories=categories, users=users)

# Create new post route
@app.route('/post/create', methods=['GET', 'POST'])
@login_required
def create_post():
    categories = Category.query.all()
    
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        summary = request.form.get('summary')
        feature_image = request.form.get('feature_image')
        category_ids = request.form.getlist('categories')
        
        if not title or not content:
            flash('Title and content are required', 'danger')
            return render_template('create_post.html', categories=categories)
        
        post = Post(
            title=title,
            content=content,
            summary=summary,
            feature_image=feature_image,
            user_id=current_user.id
        )
        
        # Add selected categories
        for cat_id in category_ids:
            category = Category.query.get(cat_id)
            if category:
                post.categories.append(category)
        
        db.session.add(post)
        db.session.commit()
        
        flash('Post created successfully!', 'success')
        return redirect(url_for('post', post_id=post.id))
    
    return render_template('create_post.html', categories=categories)

# Edit post route
@app.route('/post/<int:post_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_post(post_id):
    post = Post.query.get_or_404(post_id)
    
    # Check if user is author or admin
    if post.user_id != current_user.id and not current_user.is_admin:
        abort(403)
    
    categories = Category.query.all()
    
    if request.method == 'POST':
        post.title = request.form.get('title')
        post.content = request.form.get('content')
        post.summary = request.form.get('summary')
        post.feature_image = request.form.get('feature_image')
        
        # Update categories
        post.categories = []
        category_ids = request.form.getlist('categories')
        for cat_id in category_ids:
            category = Category.query.get(cat_id)
            if category:
                post.categories.append(category)
        
        db.session.commit()
        flash('Post updated successfully!', 'success')
        return redirect(url_for('post', post_id=post.id))
    
    return render_template('edit_post.html', post=post, categories=categories)

# Delete post route
@app.route('/post/<int:post_id>/delete', methods=['POST'])
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    
    # Check if user is author or admin
    if post.user_id != current_user.id and not current_user.is_admin:
        abort(403)
    
    db.session.delete(post)
    db.session.commit()
    flash('Post deleted successfully!', 'success')
    return redirect(url_for('index'))

# Category routes
@app.route('/category/<int:category_id>')
def category(category_id):
    category = Category.query.get_or_404(category_id)
    page = request.args.get('page', 1, type=int)
    
    posts = Post.query.filter(Post.categories.contains(category)).order_by(
        Post.created_at.desc()).paginate(page=page, per_page=5)
    
    return render_template('category.html', category=category, posts=posts)

# Create category route (admin only)
@app.route('/category/create', methods=['POST'])
@login_required
def create_category():
    if not current_user.is_admin:
        abort(403)
    
    name = request.form.get('name')
    description = request.form.get('description')
    
    if not name:
        flash('Category name is required', 'danger')
        return redirect(url_for('admin'))
    
    if Category.query.filter_by(name=name).first():
        flash('Category already exists', 'danger')
        return redirect(url_for('admin'))
    
    category = Category(name=name, description=description)
    db.session.add(category)
    db.session.commit()
    
    flash('Category created successfully!', 'success')
    return redirect(url_for('admin'))

# Delete category route (admin only)
@app.route('/category/<int:category_id>/delete', methods=['POST'])
@login_required
def delete_category(category_id):
    if not current_user.is_admin:
        abort(403)
    
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()
    
    flash('Category deleted successfully!', 'success')
    return redirect(url_for('admin'))

# Search route
@app.route('/search')
def search():
    query = request.args.get('q', '')
    if not query:
        return redirect(url_for('index'))
    
    page = request.args.get('page', 1, type=int)
    
    # Search in post title and content
    posts = Post.query.filter(
        or_(
            Post.title.ilike(f'%{query}%'),
            Post.content.ilike(f'%{query}%')
        )
    ).order_by(Post.created_at.desc()).paginate(page=page, per_page=5)
    
    return render_template('search.html', query=query, posts=posts)

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(403)
def forbidden_error(error):
    return render_template('403.html'), 403

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# Add context processor to make functions available in templates
@app.context_processor
def utility_processor():
    return {
        'now': datetime.now
    }

# API endpoints for AJAX requests
@app.route('/api/posts')
def api_posts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)
    
    posts = Post.query.order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page)
    
    result = {
        'posts': [{
            'id': post.id,
            'title': post.title,
            'summary': post.summary,
            'feature_image': post.feature_image,
            'created_at': post.created_at.strftime('%Y-%m-%d %H:%M'),
            'author': post.author.username,
            'categories': [{'id': c.id, 'name': c.name} for c in post.categories]
        } for post in posts.items],
        'has_next': posts.has_next,
        'has_prev': posts.has_prev,
        'page': posts.page,
        'total_pages': posts.pages,
        'total_items': posts.total
    }
    
    return jsonify(result)
