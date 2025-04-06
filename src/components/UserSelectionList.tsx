import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserOption {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface UserSelectionListProps {
  users: UserOption[];
  selectedUsers: UserOption[];
  onUserSelect: (users: UserOption[]) => void;
}

export function UserSelectionList({
  users,
  selectedUsers,
  onUserSelect,
}: UserSelectionListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle adding a user to selection
  const handleSelectUser = (user: UserOption) => {
    // Check if user is already selected
    const isSelected = selectedUsers.some((selected) => selected.id === user.id);

    if (isSelected) {
      // Remove user from selection
      const newSelectedUsers = selectedUsers.filter(
        (selected) => selected.id !== user.id
      );
      onUserSelect(newSelectedUsers);
    } else {
      // Add user to selection
      onUserSelect([...selectedUsers, user]);
    }
  };

  // Handle removing a user from selection
  const handleRemoveUser = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter(
      (selected) => selected.id !== userId
    );
    onUserSelect(newSelectedUsers);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search-users">Search Users</Label>
        <Input
          id="search-users"
          placeholder="Type a name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="border rounded-md">
        <ScrollArea className="h-[150px]">
          <div className="p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="py-2 px-3 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsers.some(
                  (selected) => selected.id === user.id
                );
                return (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-accent ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectUser(user)}
                      id={`user-${user.id}`}
                      className="pointer-events-none"
                    />
                    <Avatar className="h-8 w-8">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : (
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {user.name}
                      {user.email && (
                        <span className="block text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </Label>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">
          Selected ({selectedUsers.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {selectedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users selected</p>
          ) : (
            selectedUsers.map((user) => (
              <div
                key={user.id}
                className="inline-flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-sm"
              >
                {user.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-1 hover:bg-primary/20 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUser(user.id);
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
