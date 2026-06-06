'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 1.2,
  height = 35,
  displayValue = true,
  fontSize = 9,
  margin = 2,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          fontOptions: 'bold',
          font: 'monospace',
          textMargin: 2,
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error generating barcode with JsBarcode:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  return <svg ref={svgRef} className={className} />;
};
export default Barcode;
