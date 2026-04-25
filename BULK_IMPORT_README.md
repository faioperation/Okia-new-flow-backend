# Bulk CV Import & Data Extraction System

এই মডিউলটি ব্যবহার করে একসাথে অনেকগুলো সিভি (PDF) আপলোড করা যায় এবং সেগুলো থেকে অটোমেটিক ডাটা এক্সট্রাক্ট করে ডাটাবেজে সেভ করা হয়।

## মূল বৈশিষ্ট্যসমূহ (Key Features)

1.  **Scalable Queue (p-queue)**: একসাথে অনেক সিভি আপলোড করলেও এটি সার্ভার ক্র্যাশ হতে দেয় না। এটি একটি একটি করে (Concurrency: 1) সিভি প্রসেস করে।
2.  **Smart OCR Fallback**: যদি কোনো পিডিএফ থেকে সরাসরি টেক্সট না পাওয়া যায় (Scanned PDF), তবে এটি অটোমেটিক **Tesseract.js** ব্যবহার করে ছবি থেকে টেক্সট পড়ে নেয়।
3.  **Advanced Regex Parser**: কোনো AI API ছাড়াই এটি সিভির টেক্সট থেকে নাম, ইমেইল, ফোন, স্কিল, শিক্ষা এবং অভিজ্ঞতা বের করতে পারে।
4.  **Flexible Storage**: এক্সট্রাক্ট করা সব ডাটা একটি ক্লিন JSON ফরম্যাটে ডাটাবেজের `extractedJson` ফিল্ডে সেভ হয়।
5.  **Duplicate Detection**: ইমেইল বা ফোন নাম্বার মিল থাকলে এটি ডুপ্লিকেট হিসেবে চিহ্নিত করে এবং স্কিপ করে।

---

## এপিআই এন্ডপয়েন্টসমূহ (API Endpoints)

বেস ইউআরএল: `http://localhost:5000/api/v1/bulk-import`

### ১. সিভি আপলোড (Upload CVs)
-   **URL**: `/cv`
-   **Method**: `POST`
-   **Body**: `form-data` (Key: `files`, Type: `File[]` - Max 100 files)
-   **Description**: সিভিগুলো আপলোড করার পর একটি `batchId` রিটার্ন করবে এবং প্রসেসিং ব্যাকগ্রাউন্ডে শুরু হবে। রেসপন্সে প্রথম সিভির একটি প্রিভিউ দেখাবে।

### ২. সব ব্যাচের লিস্ট (Get All Batches)
-   **URL**: `/batches`
-   **Method**: `GET`
-   **Description**: এ পর্যন্ত যতগুলো ব্যাচ আপলোড হয়েছে সেগুলোর লিস্ট এবং স্ট্যাটাস দেখাবে।

### ৩. ব্যাচ ডিটেইলস (Get Batch by ID)
-   **URL**: `/batch/:id`
-   **Method**: `GET`
-   **Description**: নির্দিষ্ট একটি ব্যাচের স্ট্যাটাস এবং ওই ব্যাচে কয়টি সিভি সফলভাবে সেভ হয়েছে তা দেখাবে।

### ৪. সব ক্যান্ডিডেট (Get All Candidates)
-   **URL**: `/all-candidates`
-   **Method**: `GET`
-   **Description**: ডাটাবেসে থাকা সব ক্যান্ডিডেটের লিস্ট এবং তাদের ফুল এক্সট্রাক্টেড JSON ডাটা রিটার্ন করবে।

### ৫. সিঙ্গেল ক্যান্ডিডেট (Get Candidate by ID)
-   **URL**: `/candidate/:id`
-   **Method**: `GET`
-   **Description**: নির্দিষ্ট একজন ক্যান্ডিডেটের সব তথ্য (Skills, Education, Experience, JSON) দেখাবে।

### ৬. ফেইলর লগ (Get Batch Failures)
-   **URL**: `/batch/:id/failures`
-   **Method**: `GET`
-   **Description**: যদি কোনো সিভি প্রসেস হতে ব্যর্থ হয়, তবে তার কারণ এখানে পাওয়া যাবে।

---

## ডাটা স্ট্রাকচার (Extracted JSON)

প্রতিটি ক্যান্ডিডেটের জন্য নিচের ফরম্যাটে ডাটা পাওয়া যাবে:

```json
{
  "candidate_name": "Full Name",
  "contact": {
    "email": "email@example.com",
    "phone": "+880...",
    "location": "City, Country",
    "linkedin": "URL or null"
  },
  "professional_summary": "Summary text...",
  "total_years_experience": 5,
  "top_skills": ["Skill 1", "Skill 2"],
  "education": [...],
  "employment_history": [...],
  "projects_and_certifications": [...]
}
```

---

## টেকনিক্যাল স্ট্যাক (Tech Stack)

-   **Backend**: Node.js, Express, TypeScript
-   **Database**: PostgreSQL (Prisma ORM)
-   **Extraction**: pdf-parse, Tesseract.js (OCR)
-   **Queue Management**: p-queue
-   **File Handling**: Multer
