from PIL import Image

def crop_image(image_path, output_folder, crop_size=(900, 900)):
    img = Image.open(image_path)
    width, height = img.size
    rows = height // crop_size[1]
    cols = width // crop_size[0]

    count = 0
    for row in range(rows):
        for col in range(cols):
            left = col * crop_size[0]
            top = row * crop_size[1]
            right = left + crop_size[0]
            bottom = top + crop_size[1]

            cropped_img = img.crop((left, top, right, bottom))
            cropped_img.save(f"{output_folder}/cropped_{count}.png")
            count += 1

image_path = "cube-mapping-skybox-texture-mapping-three-js-cube-34faf0649c21fccc1b8041681ce6ac23.png"  # Đường dẫn của ảnh bạn muốn cắt
output_folder = "./"      # Thư mục đầu ra để lưu các ảnh đã cắt

crop_image(image_path, output_folder)