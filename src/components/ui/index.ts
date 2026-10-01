/**
 * Barrel export for the shared UI library.
 *
 * These primitives are deliberately app-agnostic: the authenticated CodeRev
 * application will import from here rather than redefining its own.
 */

export { Alert, alertVariants, type AlertProps } from "./alert";
export {
  Avatar,
  AvatarGroup,
  type AvatarGroupProps,
  type AvatarProps,
} from "./avatar";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Button, buttonVariants, type ButtonProps } from "./button";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
  type CardProps,
} from "./card";
export {
  Checkbox,
  Switch,
  type CheckboxProps,
  type SwitchProps,
} from "./checkbox";
export {
  CodeBlock,
  type CodeBlockProps,
  type CodeLine,
  type CodeToken,
} from "./code-block";
export { Container, type ContainerProps } from "./container";
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type SortDirection,
} from "./data-table";
export { Dialog, type DialogProps } from "./dialog";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { Field, type FieldProps } from "./field";
export {
  Input,
  Select,
  Textarea,
  type InputProps,
  type SelectProps,
} from "./input";
export { Pagination, type PaginationProps } from "./pagination";
export { Progress, type ProgressProps } from "./progress";
export { Separator, type SeparatorProps } from "./separator";
export { Skeleton, SkeletonText } from "./skeleton";
export { Spinner } from "./spinner";
export { Stat, type StatProps } from "./stat";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  type TableCellProps,
  type TableHeaderCellProps,
  type TableRowProps,
} from "./table";
export { Tabs, type TabItem, type TabsProps } from "./tabs";
export { Tooltip, type TooltipProps } from "./tooltip";
