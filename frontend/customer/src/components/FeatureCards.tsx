import React from 'react';
import { Radar, Lock, Bot, PlaneTakeoff } from 'lucide-react';

export const FeatureCards: React.FC = () => {
  return (
    <section className="bg-[#f3f4f3] border-t border-b border-[#c4c6ce] py-14 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="font-label-caps text-xs text-[#005cba] font-semibold uppercase tracking-wider block">
            Aviation Engineering Benchmark
          </span>
          <h3 className="font-headline text-2xl sm:text-3xl text-[#000f22] font-semibold mt-1">
            Engineered for Absolute Flight Certainty
          </h3>
          <p className="text-sm text-[#43474d] mt-2">
            Every passenger seat is coupled with real-time sector dispatch telemetrics and proactive travel intelligence.
          </p>
        </div>

        {/* 4 Feature Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Real-Time Telemetry */}
          <div className="bg-white p-6 rounded-lg border border-[#c4c6ce] hover:border-[#74777e] hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded bg-[#d7e3ff] text-[#001b3e] flex items-center justify-center mb-4">
                <Radar className="w-5 h-5 text-[#005cba]" />
              </div>
              <h4 className="font-headline text-sm font-semibold text-[#000f22] mb-2">
                Real-Time Telemetry
              </h4>
              <p className="text-xs text-[#43474d] leading-relaxed">
                Live ADS-B tracking and transponder sector telemetry streamed right onto passenger boarding passes.
              </p>
            </div>
          </div>

          {/* Card 2: Algorithmic Fare Holds */}
          <div className="bg-white p-6 rounded-lg border border-[#c4c6ce] hover:border-[#74777e] hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded bg-[#d7e3ff] text-[#001b3e] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-[#005cba]" />
              </div>
              <h4 className="font-headline text-sm font-semibold text-[#000f22] mb-2">
                Algorithmic Fare Holds
              </h4>
              <p className="text-xs text-[#43474d] leading-relaxed">
                Lock guaranteed seat tariffs for 24-72 hours without fluctuating inventory surcharges or hidden fees.
              </p>
            </div>
          </div>

          {/* Card 3: AeroAI Concierge */}
          <div className="bg-white p-6 rounded-lg border border-[#c4c6ce] hover:border-[#74777e] hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded bg-[#d7e3ff] text-[#001b3e] flex items-center justify-center mb-4">
                <Bot className="w-5 h-5 text-[#005cba]" />
              </div>
              <h4 className="font-headline text-sm font-semibold text-[#000f22] mb-2">
                AeroAI Concierge
              </h4>
              <p className="text-xs text-[#43474d] leading-relaxed">
                Context-aware RAG vector assistant resolving gate adjustments, baggage policies, and re-routings instantly.
              </p>
            </div>
          </div>

          {/* Card 4: Fleet Reliability */}
          <div className="bg-white p-6 rounded-lg border border-[#c4c6ce] hover:border-[#74777e] hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded bg-[#d7e3ff] text-[#001b3e] flex items-center justify-center mb-4">
                <PlaneTakeoff className="w-5 h-5 text-[#005cba]" />
              </div>
              <h4 className="font-headline text-sm font-semibold text-[#000f22] mb-2">
                Fleet Reliability
              </h4>
              <p className="text-xs text-[#43474d] leading-relaxed">
                Average aircraft age of 2.4 years with triple-redundancy dispatch systems across North American &amp; European corridors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
