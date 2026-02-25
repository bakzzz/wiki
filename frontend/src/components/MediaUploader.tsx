import React, { useState } from 'react';
import { Upload, Button, message } from 'antd';
import Icon from './Icon';

interface MediaUploaderProps {
    onUploadComplete?: (objectKey: string, downloadUrl: string) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            // Step 1: Get presigned upload URL from backend
            const res = await fetch(`http://localhost:8000/api/v1/media/upload-url?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
            });
            const { upload_url, object_key } = await res.json();

            // Step 2: Upload file directly to MinIO via presigned URL
            await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            // Step 3: Get download URL
            const dlRes = await fetch(`http://localhost:8000/api/v1/media/download-url?object_key=${encodeURIComponent(object_key)}`);
            const { download_url } = await dlRes.json();

            message.success('Файл загружен!');
            if (onUploadComplete) onUploadComplete(object_key, download_url);
        } catch {
            message.error('Ошибка загрузки');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Upload
            customRequest={({ file }) => handleUpload(file as File)}
            showUploadList={false}
        >
            <Button icon={<Icon name="upload" />} loading={uploading}>
                Загрузить
            </Button>
        </Upload>
    );
};

export default MediaUploader;
