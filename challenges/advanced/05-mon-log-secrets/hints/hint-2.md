# Hint 2: The fix

Remove all `echo ${{ secrets.* }}` steps. If you must reference a secret, use `::add-mask::${{ secrets.X }}` FIRST to register it as a mask, then use it. The mask ensures the value is replaced with `***` in all subsequent output.
