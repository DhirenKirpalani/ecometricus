
import React from 'react';
import { ScrollText } from 'lucide-react';

interface Section {
  title: string;
  content: string | string[];
}

const sections: Section[] = [
  {
    title: 'Acceptance of Terms',
    content:
      'By accessing or using Ecometricus, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you may not access or use the platform. These terms apply to all users including administrators, supervisors, managers, and staff.',
  },
  {
    title: 'Platform Use & Eligibility',
    content: [
      'You must be at least 18 years old and represent a legitimate hospitality or F&B business to use Ecometricus.',
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
      'You agree not to share your login credentials or allow unauthorized persons to access your account.',
      'Each property subscription is for the use of that property\'s authorized personnel only.',
    ],
  },
  {
    title: 'Permitted Use',
    content: [
      'Use the platform to track, analyze, and report on your property\'s F&B sustainability and operational metrics.',
      'Generate ESG reports and share them internally with your team or management.',
      'Input accurate and truthful operational data to the best of your knowledge.',
      'Integrate with third-party systems (POS, PMS, CRM) using authorized API connections.',
    ],
  },
  {
    title: 'Prohibited Activities',
    content: [
      'Reverse engineering, decompiling, or attempting to extract the source code of the platform.',
      'Uploading malicious code, viruses, or attempting to disrupt platform availability.',
      'Using the platform for any unlawful purpose or to violate any applicable regulations.',
      'Reselling, sublicensing, or redistributing access to the platform without written consent.',
      'Submitting false, misleading, or fraudulent data into the system.',
    ],
  },
  {
    title: 'Intellectual Property',
    content:
      'All platform features, design, algorithms, AI models, content, and branding are the intellectual property of Us+AI Bureau and Ecometricus. Nothing in these Terms grants you ownership of any platform component. You retain ownership of the data you input, as described in our Privacy Policy.',
  },
  {
    title: 'Data Accuracy',
    content:
      'Ecometricus provides analytics and recommendations based on data you provide. We are not responsible for inaccuracies in insights arising from incorrect, incomplete, or outdated data submitted by users. It is your responsibility to review and validate all reports before acting on them.',
  },
  {
    title: 'Availability & Uptime',
    content:
      'We strive to maintain high platform availability but do not guarantee uninterrupted access. Scheduled maintenance, updates, or unforeseen technical issues may result in temporary downtime. We will communicate planned outages in advance where possible.',
  },
  {
    title: 'Limitation of Liability',
    content:
      'To the maximum extent permitted by law, Ecometricus and Us+AI Bureau shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability in any matter arising out of or related to these terms shall not exceed the fees paid by you in the three months preceding the claim.',
  },
  {
    title: 'Termination',
    content:
      'We reserve the right to suspend or terminate your account if you breach these Terms of Service or engage in activity harmful to the platform or other users. You may also terminate your account at any time by contacting support. Upon termination, your data will be handled per our Privacy Policy.',
  },
  {
    title: 'Changes to Terms',
    content:
      'We may update these Terms of Service at any time. Continued use of the platform after changes constitutes acceptance. We will notify you of material changes via email or an in-app notification at least 14 days in advance.',
  },
  {
    title: 'Governing Law',
    content:
      'These Terms of Service are governed by and construed in accordance with applicable international hospitality and data protection law. Any disputes will be resolved through binding arbitration or the courts of the applicable jurisdiction, as agreed between parties.',
  },
];

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(119,177,57,0.06), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 mb-6">
            <ScrollText className="text-brand-eco" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco mb-3">Legal</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-4">
        <div className="bg-brand-eco/5 border border-brand-eco/20 rounded-2xl p-6 sm:p-8">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            These Terms of Service govern your access to and use of <span className="text-brand-eco font-bold">Ecometricus</span> by Us+AI Bureau, including all features, dashboards, AI tools, and reports. Please read them carefully before using the platform.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6 pb-24">
        {sections.map((section, i) => (
          <div key={i} className="bg-brand-dark/60 border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-brand-eco/20 transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <span className="shrink-0 text-xs font-black text-brand-eco/40 font-geometric tabular-nums mt-1">
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
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-eco/60 mt-2" />
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

export default TermsPage;
