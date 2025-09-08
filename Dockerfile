# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend directory into the container at /app
COPY ./backend .

# Make port 5001 available to the world outside this container
EXPOSE 5001

# Define environment variable
ENV NAME World

# Run main.py when the container launches
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "main:app"]