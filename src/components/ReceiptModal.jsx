import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Receipt from './Receipt';

export default function ReceiptModal({ saleId, onClose }) {
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSale(saleId)
            .then(data => {
                setSale(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [saleId]);

    if (!saleId) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#fff',
                color: '#000',
                width: '400px',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                position: 'relative',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Receipt...</div>
                ) : !sale ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Receipt Not Found</div>
                ) : (
                    <Receipt sale={sale} onClose={onClose} />
                )}
            </div>
        </div>
    );
}
