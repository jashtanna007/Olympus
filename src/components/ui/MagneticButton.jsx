import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * MagneticButton — button that magnetically follows the cursor on hover.
 *
 * @param {"gold"|"outline"|"ghost"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {string} className
 * @param {React.ReactNode} children
 */
export default function MagneticButton({
  variant = "gold",
  size = "md",
  className = "",
  children,
  ...rest
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 18 });
  const springY = useSpring(y, { stiffness: 200, damping: 18 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const sizeClasses = {
    sm: "h-9 px-4 text-xs gap-1.5",
    md: "h-12 px-6 text-sm gap-2",
    lg: "h-14 px-8 text-base gap-2.5",
  };

  const variantClasses = {
    gold: "bg-olympus-gold text-olympus-bg font-semibold hover:brightness-110 shadow-[0_4px_20px_-4px_rgba(244,200,74,0.5)]",
    outline:
      "border border-white/15 text-white font-medium hover:bg-white/5 hover:border-white/25",
    ghost:
      "text-olympus-muted font-medium hover:text-white hover:bg-white/5",
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.96 }}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
