export function StatusBadge({ wycofany }: { wycofany: boolean }) {
  return wycofany ? (
    <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      wycofany
    </span>
  ) : (
    <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_0_2px_rgb(34_197_94_/_0.2)]" />
      aktywny
    </span>
  );
}

export function UserBadge({ user }: { user: { imie: string; nazwisko: string } | null | undefined }) {
  return user ? (
    <span className="text-gray-800 dark:text-gray-200">
      {user.imie} {user.nazwisko}
    </span>
  ) : (
    <span className="text-gray-400 dark:text-gray-500">nieprzypisany</span>
  );
}
