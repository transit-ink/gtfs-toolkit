import { CircleLoaderBlock } from './circleLoader';

const PageLoader = ({ text }: { text?: string }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <CircleLoaderBlock text={text} />
    </div>
  );
};

export default PageLoader;
