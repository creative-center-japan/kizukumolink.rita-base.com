// src/app/contact/page.tsx

export default function ContactPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">お問い合わせ</h1>
      <p className="text-sm text-slate-700 leading-relaxed">
        ご質問やご要望は以下のメールアドレスまでご連絡ください：<br />
        <a href="mailto:info@example.com" className="text-blue-600 underline">info@example.com</a>
      </p>
    </main>
  );
}
