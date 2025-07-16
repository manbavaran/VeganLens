# 🥬 GreenScan

**A simple scanner that tells you whether your food is vegan — powered by OCR and ingredient matching.**

---

## 📌 What is GreenScan?

GreenScan is a lightweight AI-powered tool that uses OCR to extract text from ingredient labels and determines whether the food is vegan. It detects animal-derived substances based on a keyword-matching system and provides clear feedback for plant-based consumers.

---

## 🚀 Features

- 🧾 **OCR-powered ingredient recognition**
- 🌱 **Vegan-friendly check based on curated ingredient lists**
- ⚡ Simple CLI or GUI interface (depending on implementation)
- 🧠 Customizable animal-derived keyword dictionary
- 📸 Works with any label image (JPEG, PNG, etc.)

---

## 📂 Project Structure

차차 수정할 예정

## 📸 Example

Input (Ingredient Label Image):

> _Ingredients: Milk, Sugar, Cocoa Butter, Lecithin, Natural Flavors_

GreenScan output:

⚠️ Not Vegan: Detected animal-derived ingredient(s): milk

yaml


---

## 🛠️ Installation

git clone https://github.com/your-username/GreenScan.git
cd GreenScan
pip install --index-url https://download.pytorch.org/whl/cu118 -r requirements.txt

⚠️ 위 명령어를 사용하지 않으면 PyTorch GPU 버전이 설치되지 않아 오류가 날 수 있습니다.


Dependencies include:

차차 수정할 것

✅ Usage

python main.py --image path/to/your/image.jpg
Optional flags:

--lang en : Language setting for OCR (default: English)

--verbose : Print full ingredient breakdown



🧠 How it Works
OCR extracts text from a food label image.

Extracted text is tokenized and normalized.

Keywords are matched against a custom list of non-vegan substances (e.g., milk, gelatin, casein, honey).

If any matches are found, GreenScan marks the product as non-vegan.

You can easily expand keywords.json to include more terms, derivatives, or language variants.


📌 Roadmap
 Add mobile version

 Expand to multi-language support

 Build a simple web interface

 Connect to Open Food Facts API

 Support allergen analysis (future add-on)


 📜 License

협의예정



