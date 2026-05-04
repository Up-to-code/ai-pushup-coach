'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'uptocodejs@gmail.com';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Support request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <main className="apple-section" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="apple-doc">
        <p className="apple-eyebrow">Support</p>
        <h1 className="apple-doc-title">Get in touch.</h1>

        <div className="apple-doc-body" style={{ marginBottom: '48px' }}>
          <p>
            Have a question about your account, subscriptions, camera tracking, or anything else? Send us a message and we will get back to you.
          </p>
        </div>

        {sent ? (
          <div className="apple-success">
            <CheckCircle size={48} />
            <h3>Message ready</h3>
            <p>Your email client should have opened with the message. If not, email us directly at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
          </div>
        ) : (
          <form className="apple-form" onSubmit={handleSubmit}>
            <div className="apple-form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="apple-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="apple-form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                placeholder="Describe your issue or question..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="button primary" style={{ width: '100%', marginTop: '8px' }}>
              Send message <Send size={18} aria-hidden="true" />
            </button>
          </form>
        )}


      </div>
    </main>
  );
}
