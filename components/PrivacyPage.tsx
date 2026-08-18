
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface Section {
  title: string;
  content: string | string[];
}

const sections: Section[] = [
  {
    title: 'Information We Collect',
    content: [
      'Account information such as your name, email address, property name, and role when you register.',
      'F&B operational data you voluntarily input into the platform — food waste weights, outlet metrics, and ESG figures.',
      'Usage data including pages visited, features used, session duration, and device/browser type for improving the platform.',
      'Assessment responses submitted through our sustainability questionnaire.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'To provide, operate, and improve the Ecometricus platform and its AI-powered features.',
      'To generate sustainability reports, ESG metrics, and operational insights personalized to your property.',
      'To communicate platform updates, new features, and relevant sustainability insights.',
      'To comply with legal obligations and enforce our Terms of Service.',
    ],
  },
  {
    title: 'Data Confidentiality',
    content:
      'All information provided through Ecometricus is strictly confidential. Data shared by your property is used solely for analytical and operational purposes within your account. We do not sell, transfer, or disclose your data to third parties except as required by law or with your explicit consent. Each property\'s data is logically isolated and accessible only to authorized users within that account.',
  },
  {
    title: 'Data Security',
    content:
      'We use industry-standard security measures including TLS/HTTPS encryption in transit, role-based access controls, and secure cloud infrastructure. API connections to your existing systems (PMS, POS, CRM) are read-only and use encrypted tokens. No sensitive credentials are stored in plain text. We are committed to maintaining the integrity and security of all data entrusted to us.',
  },
  {
    title: 'Data Ownership',
    content:
      'You retain full ownership and control of all data you input into Ecometricus. You may request an export or deletion of your data at any time by contacting our support team. Upon account termination, your data will be securely purged from our systems within 30 days unless retention is required by applicable law.',
  },
  {
    title: 'Cookies & Tracking',
    content:
      'We use essential cookies to keep you logged in and maintain your session. We may use analytics tools to understand aggregate platform usage. We do not use advertising trackers or sell data to ad networks. You can manage cookie preferences through your browser settings.',
  },
  {
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last Updated" date and notify you via email or an in-app notice. Continued use of the platform after changes constitutes your acceptance of the revised policy.',
  },
  {
    title: 'Contact',
    content:
      'If you have questions about this Privacy Policy or how your data is handled, please reach out to our team through the Contact page or directly at the email address on file.',
  },
];

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(200,164,19,0.07), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 mb-6">
            <ShieldCheck className="text-brand-gold" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-3">Legal</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-4">
        <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-6 sm:p-8">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            At <span className="text-brand-gold font-bold">Ecometricus</span> by Us+AI Bureau, we are committed to protecting your privacy and the confidentiality of your property's data. This Privacy Policy explains what information we collect, how we use it, and the rights you have over your data.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6 pb-24">
        {sections.map((section, i) => (
          <div key={i} className="bg-brand-dark/60 border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-brand-gold/20 transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <span className="shrink-0 text-xs font-black text-brand-gold/40 font-geometric tabular-nums mt-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base sm:text-lg font-geometric font-black text-white uppercase tracking-widest">
                {section.title}
              </h2>
            </div>
            {Array.isArray(section.content) ? (
              <ul className="space-y-3 ml-8">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-gold/60 mt-2" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ml-8 text-sm text-gray-400 leading-relaxed">{section.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPage;
