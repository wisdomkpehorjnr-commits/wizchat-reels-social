import { motion } from 'framer-motion';

const LoadingDots = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2.5 h-2.5 rounded-full bg-primary"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingDots;
