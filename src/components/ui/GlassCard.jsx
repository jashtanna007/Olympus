import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * GlassCard — glassmorphism card with tilt-on-hover and optional aurora border.
 *
 * @param {"default"|"strong"|"dark"} variant — glass intensity
 * @param {boolean} aurora — animated gold/blue border
 * @param {boolean} tilt — 3D tilt on hover
 * @param {boolean} hover — subtle scale on hover
 * @param {string} className — extra classes
 * @param {function} onClick
 * @param {React.ReactNode} children
 */
export default function GlassCard({
  variant = "default",
  aurora = false,
  tilt = false,
  hover = false,
  className = "",
  onClick,
  children,
  ...rest
}) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [6, -6]), {
    stiffness: 250,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-6, 6]), {
    stiffness: 250,
    damping: 22,
  });

  const handleMouseMove = (e) => {
    if (!tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const glassClass =
    variant === "strong"
      ? "glass-strong"
      : variant === "dark"
        ? "glass-dark"
        : "glass";

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={tilt ? { rotateX, rotateY, transformPerspective: 800 } : undefined}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`rounded-2xl ${glassClass} ${aurora ? "aurora-border" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
      {...rest}
    >
      {/* Sheen highlight on hover */}
      {tilt && isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(600px circle at ${mouseX.get() * 100}% ${mouseY.get() * 100}%, rgba(244,200,74,0.06), transparent 60%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
