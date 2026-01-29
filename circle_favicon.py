from PIL import Image, ImageDraw

def make_circle_favicon(input_path, output_path):
    try:
        # Open the image (favicon.ico might contain multiple sizes, we take the largest or default)
        img = Image.open(input_path).convert("RGBA")
        
        # Create a transparency mask
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, img.size[0], img.size[1]), fill=255)
        
        # Apply the mask
        result = Image.new("RGBA", img.size, (0, 0, 0, 0))
        result.paste(img, (0, 0), mask=mask)
        
        # Save as PNG
        result.save(output_path, "PNG")
        print(f"Successfully created circular favicon at {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "public/favicon.ico"
    output_file = "public/favicon.png"
    make_circle_favicon(input_file, output_file)
