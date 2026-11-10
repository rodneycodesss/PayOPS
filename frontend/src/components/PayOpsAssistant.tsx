import React, { useState } from 'react';
import { X, ArrowUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PayOpsAssistantProps {
  onClose: () => void;
}

export const PayOpsAssistant: React.FC<PayOpsAssistantProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'assistant';
    text?: string;
    type?: 'text' | 'reconciliation_card' | 'confirmation_card';
    data?: any;
  }>>([
    {
      sender: 'user',
      text: 'Which payments need review today?',
    },
    {
      sender: 'assistant',
      text: '7 payments need review. The largest is SKT2C77PD3 for KSh 8,000, which matches two invoices.',
    },
    {
      sender: 'assistant',
      type: 'reconciliation_card',
      data: {
        ref: 'SKT2C77PD3',
        candidates: 'INV-0046 or INV-0048',
        runInfo: 'From reconciliation run 218, 08:40',
      },
    },
    {
      sender: 'user',
      text: 'Allocate it to INV-0046',
    },
    {
      sender: 'assistant',
      type: 'confirmation_card',
      data: {
        message: 'Allocate SKT2C77PD3 (KSh 8,000) to INV-0046? This is recorded in the audit log under your name.',
        confirmed: false,
      },
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || inputVal;
    if (!q.trim()) return;

    const newMsgs = [...messages, { sender: 'user' as const, text: q }];
    setInputVal('');

    // Responsive automated assistant logic
    setTimeout(() => {
      let reply = "I've checked your ledger. All accounts are synchronized.";
      if (q.toLowerCase().includes('collection')) {
        reply = "Today's collections stand at KSh 184,500 across 4 M-PESA payments and 1 bank settlement.";
      } else if (q.toLowerCase().includes('overdue')) {
        reply = "There is 1 overdue invoice: INV-0041 for Customer D (KSh 3,200), due 14 days ago.";
      } else if (q.toLowerCase().includes('match') || q.toLowerCase().includes('explain')) {
        reply = "SKT2C77PD3 matches INV-0046 and INV-0048 by exact amount (KSh 8,000). Customer account reference was ambiguous.";
      }

      setMessages((prev) => [...prev, { sender: 'assistant' as const, text: reply }]);
    }, 500);
  };

  const handleConfirmAllocation = (index: number) => {
    const updated = [...messages];
    updated[index].data.confirmed = true;
    setMessages(updated);
    setToastMessage('Allocated SKT2C77PD3 to INV-0046. Logged in audit trail.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex flex-col h-full font-sans text-slate-900 bg-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header (Page 21) */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">PayOps Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
            Asks before it acts
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Body (Page 21) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
        {messages.map((m, idx) => {
          if (m.sender === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="bg-[#080D18] text-white px-4 py-3 rounded-2xl max-w-[85%] font-medium">
                  {m.text}
                </div>
              </div>
            );
          }

          if (m.type === 'reconciliation_card') {
            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-950 text-sm">
                      {m.data.ref}
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                      {m.data.candidates}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/reconciliation')}
                    className="text-[#16A6D9] font-bold text-xs hover:underline"
                  >
                    Open
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                  {m.data.runInfo}
                </div>
              </div>
            );
          }

          if (m.type === 'confirmation_card') {
            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5"
              >
                <p className="text-slate-700 leading-relaxed font-medium">
                  {m.data.message}
                </p>
                {m.data.confirmed ? (
                  <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Allocation confirmed & recorded</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleConfirmAllocation(idx)}
                      className="px-4 py-2 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        const updated = [...messages];
                        updated.splice(idx, 1);
                        setMessages(updated);
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={idx} className="flex justify-start">
              <div className="bg-slate-100 text-slate-800 px-4 py-3 rounded-2xl max-w-[90%] leading-relaxed">
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Prompts (Page 21) */}
      <div className="px-4 py-2 border-t border-slate-100 flex flex-wrap gap-2">
        <button
          onClick={() => handleSend("Today's collections")}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
        >
          Today's collections
        </button>
        <button
          onClick={() => handleSend('Overdue invoices')}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
        >
          Overdue invoices
        </button>
        <button
          onClick={() => handleSend('Explain this match')}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
        >
          Explain this match
        </button>
      </div>

      {/* Input Field (Page 21) */}
      <div className="p-4 border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask about your payments"
            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16A6D9] focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition shadow-sm"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-slate-400 mt-2 text-center leading-normal">
          Answers come from your PayOps data. Check important figures. Illustrative data.
        </p>
      </div>
    </div>
  );
};
