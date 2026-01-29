from PIL import Image
from collections import Counter

def get_dominant_colors(image_path, num_colors=5):
    try:
        image = Image.open(image_path)
        image = image.convert('RGB')
        image = image.resize((150, 150))      # Resize to speed up
        
        pixels = list(image.getdata())
        counts = Counter(pixels)
        
        # Sort by count
        most_common = counts.most_common(num_colors)
        
        print(f"Dominant Colors for {image_path}:")
        hex_codes = []
        for i, (color, freq) in enumerate(most_common):
            r, g, b = color
            hex_code = '#{:02x}{:02x}{:02x}'.format(r, g, b)
            hex_codes.append(hex_code)
            print(f"{i+1}. {hex_code} (RGB: {r},{g},{b}) - Count: {freq}")
            
        return hex_codes

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    # Use the absolute path provided in context
    path = "/Users/user1/Desktop/MAYCODIESEL/ERM AND POS/Diseno-sin-titulo-31.png"
    get_dominant_colors(path)
