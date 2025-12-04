import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

const ChildResultsPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Exam Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Exam results will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
};

export default ChildResultsPage;
