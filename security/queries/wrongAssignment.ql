/**
 * @name Wrong Assignment
 * @description Some description here.
 * @kind problem
 * @problem.severity error
 * @id javascript/service-bus-publish/wrong-assignment
 */

import javascript

from Expr e
where e.isPure() and
  e.getParent() instanceof ExprStmt
select e, "This expression has no effect."