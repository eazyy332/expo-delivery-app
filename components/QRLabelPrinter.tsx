import React from 'react';
import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';

interface QRLabelPrinterProps {
  orderNumber: string;
  qrCode: string;
  customerName: string;
}

export const printQRLabel = async ({ orderNumber, qrCode, customerName }: QRLabelPrinterProps) => {
  if (Platform.OS === 'web') {
    // For web, open a new window with the label for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateLabelHTML(orderNumber, qrCode, customerName));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      Alert.alert('Print Geblokkeerd', 'Pop-up blocker voorkomt het openen van het print venster. Schakel pop-ups in voor deze site.');
    }
    return;
  }

  try {
    await Print.printAsync({
      html: generateLabelHTML(orderNumber, qrCode, customerName),
      width: 300,
      height: 400,
      orientation: Print.Orientation.portrait,
    });
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Fout', 'Kon QR label niet printen. Controleer of er een printer beschikbaar is.');
  }
};

const generateLabelHTML = (orderNumber: string, qrCode: string, customerName: string): string => {
  // Generate QR code using a web service (for demo purposes)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode || orderNumber)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Eazyy Order Label</title>
      <style>
        @page {
          size: 4in 6in;
          margin: 0.25in;
        }
        
        body { 
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: white;
        }
        
        .label {
          text-align: center;
          border: 3px solid #000;
          padding: 30px 20px;
          width: 100%;
          max-width: 280px;
          border-radius: 8px;
          background: white;
        }
        
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 15px;
          letter-spacing: 2px;
        }
        
        .qr-container {
          margin: 20px 0;
          display: flex;
          justify-content: center;
        }
        
        .qr-code {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          background: white;
        }
        
        .order-info {
          margin-top: 20px;
        }
        
        .order-number {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        
        .customer-name {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 15px;
          font-weight: 500;
        }
        
        .instructions {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 15px;
          line-height: 1.4;
        }
        
        .date {
          font-size: 10px;
          color: #d1d5db;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="logo">EAZYY</div>
        
        <div class="qr-container">
          <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" width="150" height="150" />
        </div>
        
        <div class="order-info">
          <div class="order-number">#${orderNumber}</div>
          <div class="customer-name">${customerName}</div>
          <div class="instructions">
            Scan deze QR-code bij<br>
            pickup en drop-off
          </div>
          <div class="date">${new Date().toLocaleDateString('nl-NL')}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default { printQRLabel };