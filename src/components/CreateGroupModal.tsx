import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { UserSelectionList } from "./UserSelectionList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: {
    name: string;
    description: string;
    category: string;
    totalAmount: number;
    date: Date;
    members: User[];
  }) => void;
  availableUsers: User[];
  existingGroups?: { id: string; name: string }[];
}

const expenseCategories = [
  "Food",
  "Transportation",
  "Accommodation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Trip",
  "Gift",
  "Other",
];

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  availableUsers,
  existingGroups = [],
}: CreateGroupModalProps) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExistingGroups, setShowExistingGroups] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setSelectedDate(new Date());
      setShowExistingGroups(false);
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      totalAmount: "",
    },
  });

  // Reset form and state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form and state when modal closes
      reset();
      setSelectedUsers([]);
      setSelectedDate(new Date());
      setIsSubmitting(false);
      setShowExistingGroups(false);
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: {
    name: string;
    description: string;
    category: string;
    totalAmount: string;
  }) => {
    try {
      setIsSubmitting(true);

      if (selectedUsers.length === 0) {
        toast.error("Please select at least one group member");
        setIsSubmitting(false);
        return;
      }

      // Convert total amount to number
      const totalAmount = parseFloat(data.totalAmount);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        toast.error("Please enter a valid amount");
        setIsSubmitting(false);
        return;
      }

      const groupData = {
        name: data.name,
        description: data.description,
        category: data.category,
        totalAmount: totalAmount,
        date: selectedDate,
        members: selectedUsers,
      };

      // Call the parent's onCreateGroup function
      await onCreateGroup(groupData);

      // Let the parent handle closing the modal
      // The form will be reset when the modal closes via the useEffect

    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error("Failed to create group");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("Create New Group")}</DialogTitle>
          <DialogDescription>
            {t("Create a new group to split expenses with friends")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-4 py-4 overflow-y-auto pr-1">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">{t("Group Name")}</Label>
                {existingGroups.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExistingGroups(!showExistingGroups)}
                    className="text-xs h-6 px-2"
                  >
                    {showExistingGroups ? t("Hide suggestions") : t("Show suggestions")}
                  </Button>
                )}
              </div>
              <Input
                id="name"
                {...register("name", { required: t("Name is required") })}
                placeholder={t("Enter group name")}
              />
              {showExistingGroups && existingGroups.length > 0 && (
                <div className="mt-1 p-2 border rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{t("Select from existing groups:")}</p>
                  <div className="flex flex-wrap gap-1">
                    {existingGroups.map(group => (
                      <Button
                        key={group.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          reset({ ...getValues(), name: group.name });
                          setShowExistingGroups(false);
                        }}
                      >
                        {group.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {errors.name && (
                <p className="text-sm text-red-500">
                  {String(errors.name.message)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("Description (Optional)")}</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder={t("Brief description of the expense")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{t("Category")}</Label>
              <Controller
                name="category"
                control={control}
                rules={{ required: t("Please select a category") }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select a category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-sm text-red-500">
                  {String(errors.category.message)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="totalAmount">{t("Total Amount (₹)")}</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                {...register("totalAmount", {
                  required: t("Amount is required"),
                  min: {
                    value: 0.01,
                    message: t("Amount must be greater than 0"),
                  },
                })}
                placeholder="0.00"
              />
              {errors.totalAmount && (
                <p className="text-sm text-red-500">
                  {String(errors.totalAmount.message)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t("Date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : t("Select date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>{t("Group Members")}</Label>
              <UserSelectionList
                users={availableUsers}
                selectedUsers={selectedUsers}
                onUserSelect={setSelectedUsers}
              />
              {selectedUsers.length === 0 && (
                <p className="text-sm text-amber-500">
                  {t("Please select at least one member")}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? t("Creating...") : t("Create Group")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
