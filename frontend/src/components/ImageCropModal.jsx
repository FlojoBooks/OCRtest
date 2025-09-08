import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ImageCropModal = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ aspect: 16 / 9 });
  const imgRef = useRef(null);

  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleCrop = async () => {
    if (imgRef.current && crop.width && crop.height) {
      const croppedImageBlob = await getCroppedImg(imgRef.current, crop);
      onCropComplete(croppedImageBlob);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Crop Image</h2>
        <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
          <img ref={imgRef} src={image} />
        </ReactCrop>
        <button onClick={handleCrop}>Crop and Upload</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default ImageCropModal;
