
import React, { useState } from 'react';
import { Mail, CalendarCheck, MessageSquare, MapPin, Send, Check } from 'lucide-react';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', property: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const isValid = form.name.trim() && form.email.trim() && form.message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) { setAttempted(true); return; }
    // Persist locally as placeholder until backend is wired
    try {
      const existing = JSON.parse(localStorage.getItem('ecometricus_contact_submissions') || '[]');
      existing.push({ ...form, submittedAt: new Date().toISOString() });
      localStorage.setItem('ecometricus_contact_submissions', JSON.stringify(existing));
    } catch (_) {}
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const channels = [
    {
      icon: <Mail className="text-brand-gold" size={24} />,
      title: 'Email Us',
      desc: 'For general enquiries, partnerships, or support.',
      action: 'hello@ecometricus.com',
      href: 'mailto:hello@ecometricus.com',
    },
    {
      icon: <CalendarCheck className="text-brand-eco" size={24} />,
      title: 'Book a Demo',
      desc: 'Schedule a personalized 30-minute walkthrough.',
      action: 'Book on Calendly',
      href: 'https://calendly.com/urbanseed-ai/ai-bureau-services',
    },
    {
      icon: <MapPin className="text-brand-energy" size={24} />,
      title: 'Our Bureau',
      desc: 'Us+AI Bureau — luxury hospitality intelligence.',
      action: 'By appointment',
      href: undefined,
    },
  ];

  const inputClass = (field: string) =>
    `w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:bg-white/8 focus:border-brand-gold ${
      attempted && !(form as Record<string, string>)[field]?.trim()
        ? 'border-brand-alert/60'
        : 'border-white/10'
    }`;

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(200,164,19,0.07), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 mb-6">
            <MessageSquare className="text-brand-gold" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-3">Get In Touch</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            Contact Us
          </h1>
          <p className="text-base text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            Have a question, partnership idea, or want to explore what Ecometricus can do for your property? We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-14 pb-24">

        {/* Contact channel cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {channels.map((ch, i) => (
            <div key={i} className="bg-brand-dark/60 border border-white/5 rounded-2xl p-6 hover:border-brand-gold/20 transition-all duration-300 flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                {ch.icon}
              </div>
              <div>
                <p className="text-sm font-geometric font-black text-white uppercase tracking-widest mb-1">{ch.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{ch.desc}</p>
                {ch.href ? (
                  <a
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-widest text-brand-gold hover:text-white transition-colors"
                  >
                    {ch.action} →
                  </a>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-600">{ch.action}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Form + success state */}
        {submitted ? (
          <div className="max-w-xl mx-auto text-center py-16 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-eco/15 border-2 border-brand-eco mx-auto">
              <Check className="text-brand-eco" size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-geometric font-black text-white uppercase tracking-widest">Message Sent</h2>
            <p className="text-gray-400 leading-relaxed">
              Thank you for reaching out. A member of our team will get back to you within 1–2 business days.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: '', email: '', property: '', subject: '', message: '' }); setAttempted(false); }}
              className="mt-4 px-8 py-3 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 rounded-full font-bold text-xs uppercase tracking-widest transition-all"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Left info panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-geometric font-black text-white uppercase tracking-widest mb-4">
                  Why Reach Out?
                </h2>
                <ul className="space-y-4">
                  {[
                    'Questions about platform features or pricing',
                    'Partnership or integration opportunities',
                    'Media, press, or speaking requests',
                    'Technical support or onboarding help',
                    'Feedback or feature suggestions',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-gold/60 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-eco mb-2">Response Time</p>
                <p className="text-sm text-gray-400 leading-relaxed">We typically respond within <span className="text-white font-semibold">1–2 business days</span>. For urgent matters, please book a demo directly via Calendly.</p>
              </div>
            </div>

            {/* Right form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 bg-brand-dark/60 border border-white/5 rounded-2xl p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-geometric font-black text-white uppercase tracking-widest mb-2">Send a Message</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Full Name <span className="text-brand-alert">*</span></label>
                  <input type="text" placeholder="Jane Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass('name')} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Email <span className="text-brand-alert">*</span></label>
                  <input type="email" placeholder="jane@property.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass('email')} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Property / Company</label>
                <input type="text" placeholder="The Grand Hotel" value={form.property} onChange={e => setForm(p => ({ ...p, property: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:bg-white/8 focus:border-brand-gold" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Subject</label>
                <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-gold">
                  <option value="" className="bg-brand-dark">Select a topic</option>
                  <option value="demo" className="bg-brand-dark">Book a Demo</option>
                  <option value="pricing" className="bg-brand-dark">Pricing & Plans</option>
                  <option value="support" className="bg-brand-dark">Technical Support</option>
                  <option value="partnership" className="bg-brand-dark">Partnership Enquiry</option>
                  <option value="press" className="bg-brand-dark">Press / Media</option>
                  <option value="other" className="bg-brand-dark">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Message <span className="text-brand-alert">*</span></label>
                <textarea
                  rows={5}
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className={`${inputClass('message')} resize-none`}
                />
              </div>

              {attempted && !isValid && (
                <p className="text-xs text-brand-alert">Please fill in all required fields.</p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-brand-gold text-brand-dark hover:brightness-110 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all transform hover:scale-[1.02] shadow-[0_10px_25px_rgba(200,164,19,0.3)]"
              >
                <Send size={15} /> Send Message
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
