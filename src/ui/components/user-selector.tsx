"use client";

type User = {
  id: string;
  username: string;
};

type UserSelectorProps = {
  users: User[];
  currentUserId: string | null;
  onSelect: (userId: string) => void;
};

export function UserSelector({
  users,
  currentUserId,
  onSelect,
}: UserSelectorProps) {
  return (
    <nav aria-label="User selection">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-500 mb-2">
          Logged in as
        </legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Select user">
          {users.map((user) => (
            <button
              key={user.id}
              role="radio"
              aria-checked={currentUserId === user.id}
              aria-label={`Log in as ${user.username}`}
              onClick={() => onSelect(user.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                currentUserId === user.id
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {user.username}
            </button>
          ))}
        </div>
      </fieldset>
    </nav>
  );
}
