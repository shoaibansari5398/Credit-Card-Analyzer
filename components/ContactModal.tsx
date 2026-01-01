import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'General Inquiry' | 'Account Issue' | 'Billing' | 'Technical Support' | 'Feedback/Suggestion';

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: '' as Category | '',
    description: '',
    name: '',
    email: ''
  });

  const categories: Category[] = [
    'General Inquiry',
    'Account Issue',
    'Billing',
    'Technical Support',
    'Feedback/Suggestion'
  ];

  const handleNext = async () => {
    if (step === 1 && formData.category) {
      setStep(2);
    } else if (step === 2) {
      setIsSubmitting(true);
      try {
        const response = await fetch('http://localhost:8000/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to send request');

        console.log('Form submitted successfully');
        onClose();
        setTimeout(() => {
            setStep(1);
            setFormData({ category: '', description: '', name: '', email: '' });
        }, 300);
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Failed to send message. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                     <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Support</h2>
                </div>

                {step === 1 ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">What can we help you with?</h3>
                    <div className="flex flex-wrap gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.category === cat
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={handleNext}
                        disabled={!formData.category}
                        className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-white font-semibold transition-all shadow-sm ${
                          formData.category
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 hover:shadow-emerald-300'
                            : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl mb-6">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Category: {formData.category}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 line-clamp-1">{formData.description}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                          placeholder="Your Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                         <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell us a bit more about your issue..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none h-32 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={handleBack}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium text-sm px-4 py-2"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 ${
                          isSubmitting ? 'opacity-70 cursor-wait' : ''
                        }`}
                      >
                        {isSubmitting ? 'Sending...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
