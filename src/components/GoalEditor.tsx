
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FinancialGoal, Currency } from '@/types';
import { formatCurrency } from '@/utils/currencyUtils';

interface GoalEditorProps {
  goal: FinancialGoal;
  currency: Currency;
  onSave: (updatedGoal: FinancialGoal) => void;
  isOpen: boolean;
  onClose: () => void;
}

const GoalEditor: React.FC<GoalEditorProps> = ({
  goal,
  currency,
  onSave,
  isOpen,
  onClose,
}) => {
  const [editedGoal, setEditedGoal] = useState<FinancialGoal>({ ...goal });

  const handleSave = () => {
    onSave(editedGoal);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Financial Goal</DialogTitle>
          <DialogDescription>
            Update your financial goal target and current amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={editedGoal.name}
              onChange={(e) => setEditedGoal({ ...editedGoal, name: e.target.value })}
              className="col-span-3 rounded-xl"
              placeholder="My Financial Goal"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target" className="text-right">
              Target Amount
            </Label>
            <Input
              id="target"
              type="number"
              value={editedGoal.targetAmount}
              onChange={(e) => setEditedGoal({ ...editedGoal, targetAmount: parseFloat(e.target.value) || 0 })}
              className="col-span-3 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current" className="text-right">
              Current Amount
            </Label>
            <Input
              id="current"
              type="number"
              value={editedGoal.currentAmount}
              onChange={(e) => setEditedGoal({ ...editedGoal, currentAmount: parseFloat(e.target.value) || 0 })}
              className="col-span-3 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deadline" className="text-right">
              Deadline (Optional)
            </Label>
            <Input
              id="deadline"
              type="date"
              value={editedGoal.deadline || ''}
              onChange={(e) => setEditedGoal({ ...editedGoal, deadline: e.target.value })}
              className="col-span-3 rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-xl hover-scale">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalEditor;
