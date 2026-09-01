import sys
import os
import pydicom
from PIL import Image
import numpy as np

def convert_dcm_to_png(dcm_path, png_path):
    try:
        ds = pydicom.dcmread(dcm_path)
        # Check if pixel data exists
        if not hasattr(ds, 'PixelData'):
            print("No pixel data found in DICOM file.")
            # Save a blank image instead
            img = Image.new('L', (256, 256), color=20)
            img.save(png_path, 'PNG')
            return False
        
        pixel_array = ds.pixel_array
        
        # Normalize the pixel array to 0-255
        pixel_array = pixel_array.astype(float)
        
        # Rescale slope and intercept if present
        rescale_slope = getattr(ds, 'RescaleSlope', 1)
        rescale_intercept = getattr(ds, 'RescaleIntercept', 0)
        pixel_array = pixel_array * rescale_slope + rescale_intercept
        
        # Handle min/max windowing
        p_min = np.min(pixel_array)
        p_max = np.max(pixel_array)
        if p_max > p_min:
            normalized = ((pixel_array - p_min) / (p_max - p_min) * 255.0).astype(np.uint8)
        else:
            normalized = np.zeros(pixel_array.shape, dtype=np.uint8)
            
        # Invert if Monochromatic 1 (where 0 is white)
        photometric = getattr(ds, 'PhotometricInterpretation', 'MONOCHROME2')
        if photometric == 'MONOCHROME1':
            normalized = 255 - normalized
            
        # Convert to PIL Image and save
        img = Image.fromarray(normalized)
        img.save(png_path, 'PNG')
        print(f"Successfully converted {dcm_path} to {png_path}")
        return True
    except Exception as e:
        print(f"Error converting DICOM to PNG: {e}")
        # Save a blank fallback
        try:
            img = Image.new('L', (256, 256), color=40)
            img.save(png_path, 'PNG')
        except:
            pass
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python convert_dicom.py <dcm_path> <png_path>")
        sys.exit(1)
    convert_dcm_to_png(sys.argv[1], sys.argv[2])
