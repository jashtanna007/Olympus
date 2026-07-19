import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import FranchiseSlider from "../components/home/FranchiseSlider";
import FranchiseModal from "../components/home/FranchiseModal";
import QuickInfoPanel from "../components/home/QuickInfoPanel";
import StatsBar from "../components/home/StatsBar";
import RegisterCTA from "../components/home/RegisterCTA";

export default function Home() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <section className="mx-auto flex min-h-[245px] max-w-4xl flex-col items-center justify-center text-center sm:min-h-[275px] lg:min-h-[290px]">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-sky-400 sm:text-xs"
          >
            /// College Sports Fest ///
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52 }}
            className="font-display text-[44px] uppercase leading-[0.88] tracking-wide text-white sm:text-6xl lg:text-7xl"
          >
            Choose your
            <span className="mt-2 block text-sky-400 drop-shadow-[0_0_25px_rgba(14,165,233,0.5)]">
              franchise
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-xs font-medium tracking-wide text-slate-400 sm:text-sm"
          >
            Represent. Compete. Conquer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-5"
          >
            <Link
              to="/franchises"
              className="group inline-flex items-center gap-3 rounded-lg border border-sky-300/40 bg-gradient-to-r from-blue-600 to-sky-400 px-6 py-3 text-[10px] font-black uppercase tracking-[0.13em] text-white shadow-[0_0_28px_rgba(0,145,255,0.36)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(0,145,255,0.52)] sm:text-xs"
            >
              Explore franchises
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        </section>

        <section className="-mt-2 sm:-mt-3">
          <FranchiseSlider onFranchiseClick={setSelectedFranchise} />
        </section>

        <section className="mt-3 sm:mt-5">
          <QuickInfoPanel />
        </section>

        <section className="mt-3">
          <StatsBar />
        </section>

        <section className="mt-3">
          <RegisterCTA />
        </section>
      </div>

      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={Boolean(selectedFranchise)}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
