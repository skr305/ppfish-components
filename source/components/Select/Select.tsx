import * as React from 'react';
import ReactDOM from 'react-dom';
import Trigger from 'rc-trigger';
import Animate from 'rc-animate';
import List from 'rc-virtual-list';
import { polyfill } from 'react-lifecycles-compat';
import classNames from 'classnames';
import Button from '../Button';
import Spin from '../Spin';
import Icon from '../Icon';
import SelectSearch from './SelectSearch';
import placements from './placements';
import { KeyCode } from '../../utils';
import isEqual from 'lodash/isEqual';
import Option, { OptionInterface } from './Option';
import OptGroup, { OptGroupInterface } from './OptGroup';
import { LocaleContext } from '../Config/Locale/Context';
import { LocaleProperties } from '../Locale';
const noop = () => {};

interface SelectProps {
  virtual?: boolean;
  allowClear?: boolean;
  children?: React.ReactNode | React.ReactNode[] | React.ReactChildren;
  className?: string;
  tagWidth?: string | number;
  defaultActiveFirstOption?: boolean;
  defaultValue?: string | number | any[] | object;
  disabled?: boolean;
  dropdownClassName?: string;
  dropdownMatchSelectWidth?: boolean;
  dropdownStyle?: React.CSSProperties;
  errorMessage?: string | React.ReactNode;
  extraOptions?: string | React.ReactNode;
  filterOption?: boolean | ((value: SelectValue, child?: React.ReactNode) => void);
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  labelClear?: boolean;
  labelInValue?: boolean;
  loading?: boolean;
  maxCount?: number;
  maxLabelClearPanelHeight?: string | number;
  maxScrollHeight?: string | number;
  mode?: 'multiple' | 'single';
  multipleSelectAllText?: string;
  notFoundContent?: string | React.ReactNode;
  onChange?: (value?: any) => void;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onPopupScroll?: React.UIEventHandler<HTMLDivElement>;
  onSearch?: (value: any) => void;
  onSelect?: (value: any) => void;
  onDeselect?: (value: any) => void;
  onVisibleChange?: (value: any) => void;
  placeholder?: string;
  placement?: 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight';
  prefixCls?: string;
  searchInputProps?: object;
  searchPlaceholder?: string;
  selectAllText?: string;
  showArrow?: boolean;
  showMultipleSelectAll?: boolean;
  showOptionCheckedIcon?: boolean;
  showSearch?: boolean;
  showSelectAll?: boolean;
  showSingleClear?: boolean;
  size?: 'default' | 'small' | 'large';
  style?: React.CSSProperties;
  value?: string | number | any[] | object;
  visible?: boolean;
  esc?: boolean;
  required?: boolean;
  filterInactiveOption?: boolean;
}

type SelectValue = { key: string; label: string; title: string };

interface SelectState {
  searchValue?: string;
  selectValue?: SelectValue[];
  selectValueForMultiplePanel?: SelectValue[];
  popupVisible?: boolean;
  activeKey?: undefined | string;
  dropdownWidth?: string | number;
  prevProps?: SelectProps;
}

class Select extends React.Component<SelectProps, SelectState> {
  static Option: OptionInterface = Option;

  static OptGroup: OptGroupInterface = OptGroup;

  private listRef: any;

  private trigger: any;

  private selection: any;

  private selectSearch: any;

  static contextType = LocaleContext;

  static defaultProps: SelectProps = {
    virtual: true,
    allowClear: true,
    tagWidth: 'auto',
    defaultActiveFirstOption: false,
    disabled: false,
    dropdownMatchSelectWidth: true,
    filterOption: true,
    labelClear: false,
    labelInValue: false,
    loading: false,
    maxScrollHeight: 250,
    mode: 'single',
    onChange: noop,
    onPopupScroll: noop,
    onSearch: noop,
    onSelect: noop,
    onDeselect: noop,
    onVisibleChange: noop,
    placement: 'bottomLeft',
    prefixCls: 'fishd-select',
    searchInputProps: {},
    showArrow: true,
    showMultipleSelectAll: false,
    showOptionCheckedIcon: true,
    showSearch: false,
    showSelectAll: false,
    showSingleClear: false,
    size: 'default',
    style: {},
    visible: false,
    esc: true,
    required: false,
    filterInactiveOption: false,
  };

  //获取所有option的[{label,key,title}]
  static getOptionFromChildren = (children, plainOptionList = [], filter?) => {
    React.Children.forEach(children, (child: any) => {
      if (child && child.type && child.type.isSelectOption) {
        const selectOption = {
          label: child.props.children,
          key: 'value' in child.props ? child.props.value : child.key,
          title: child.props.title,
        };
        if (filter) {
          filter(child) && plainOptionList.push(selectOption);
        } else {
          plainOptionList.push(selectOption);
        }
      } else if (child && child.type && child.type.isSelectOptGroup) {
        Select.getOptionFromChildren(child.props.children, plainOptionList, filter);
      } else {
        //  其余暂时不做处理
      }
    });
    return plainOptionList;
  };

  //转换传入的value
  static getValueFromProps = (value, labelInValue, children) => {
    const valueType = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
    const optionList = Select.getOptionFromChildren(children, []);
    if (labelInValue) {
      //labelInValue数据从传入数据中取
      if (valueType === 'array') {
        return (
          (value &&
            value.map(obj => {
              const option = optionList.find(option => option.key === obj.key) || {};
              const label = obj.label || option.label || obj.key;
              const title = obj.title || option.title;
              return {
                key: obj.key,
                label,
                title,
              };
            })) ||
          []
        );
      } else if (valueType === 'object') {
        const option = optionList.find(option => option.key === value.key) || {};
        const label = value.label || option.label || value.key;
        const title = value.title || option.title;
        return [
          {
            key: value.key,
            label,
            title,
          },
        ];
      } else {
        // 其余就给空状态
        return [];
      }
    } else {
      // 非labelInValue数据从option里取
      if (valueType === 'string' || valueType === 'number') value = [value];
      return (
        (value &&
          value.map(key => {
            const option = optionList.find(option => option.key === key) || {};
            const label = option.label || key;
            const title = option.title;
            return {
              key,
              label,
              title,
            };
          })) ||
        []
      );
    }
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const { prevProps = {} } = prevState;
    const newState: SelectState = {
      prevProps: nextProps,
    };
    if ('visible' in nextProps && !isEqual(nextProps.visible, prevProps.visible)) {
      newState.popupVisible = nextProps.visible;
    }
    if ('value' in nextProps) {
      const changedValue = Select.getValueFromProps(
        nextProps.value,
        nextProps.labelInValue,
        nextProps.children,
      );
      const prevValue = Select.getValueFromProps(
        prevProps.value,
        prevProps.labelInValue,
        prevProps.children,
      );
      if (!isEqual(changedValue, prevValue)) {
        newState.selectValue = changedValue;
        if (nextProps.mode === 'multiple') {
          newState.selectValueForMultiplePanel = changedValue;
        }
      }
    }

    return newState;
  }

  constructor(props) {
    super(props);
    const { value, defaultValue, labelInValue, children, visible } = this.props;
    let initialValue: string | number | object | any[] = [];

    if ('value' in this.props) {
      initialValue = value;
    } else if ('defaultValue' in this.props) {
      initialValue = defaultValue;
    }
    const initialSelectValue = Select.getValueFromProps(initialValue, labelInValue, children);

    this.state = {
      searchValue: '',
      selectValue: initialSelectValue,
      selectValueForMultiplePanel: initialSelectValue,
      popupVisible: visible,
      activeKey: undefined,
      dropdownWidth: null,
      prevProps: props,
    };
  }

  componentDidMount() {
    this.setDropdownWidth();
  }

  componentDidUpdate() {
    this.setDropdownWidth();
  }

  //获取面板宽度
  setDropdownWidth = () => {
    if (!this.props.dropdownMatchSelectWidth) {
      return;
    }
    const width = (ReactDOM.findDOMNode(this) as HTMLElement).offsetWidth;
    if (width !== this.state.dropdownWidth) {
      this.setState({ dropdownWidth: width });
    }
  };

  //搜索键入
  updateSearchValue = e => {
    const searchValue = e.target.value;
    this.props.onSearch(searchValue);
    this.setState({ searchValue });
  };

  //清空搜索
  emptySearchValue = () => {
    const searchValue = '';
    this.props.onSearch(searchValue);
    this.setState({ searchValue });
    this.focus();
  };

  //全选操作
  selectAllOption = () => {
    this.setState({
      selectValue: this.isSelectAll()
        ? []
        : Select.getOptionFromChildren(this.props.children, [], child => !child.props.disabled),
    });
  };

  //清空数据项,mode='single'
  emptySelectValue = () => {
    this.changeVisibleState(false);
    this.props.onChange();
    this.setState({
      selectValue: [],
    });
  };

  //popup显示隐藏
  changeVisibleState = visible => {
    this.props.onVisibleChange(visible);
    const changedState: SelectState = {
      popupVisible: visible,
    };
    const { defaultActiveFirstOption, mode, children } = this.props;
    const { selectValue } = this.state;
    if (visible) {
      // 打开弹出框时，开启激活第一个选项

      // listRef.current.scrollTo(index);
      const options = Select.getOptionFromChildren(children, [], child => !child.props.disabled);

      if (defaultActiveFirstOption) {
        const firstOption = options[0] || {};
        changedState.activeKey = firstOption.key;
      }

      // mode='single'且有值时 打开弹出框，默认定位到那个位置
      if (mode === 'single' && selectValue.length > 0) {
        const activeOptionKey = selectValue[0].key;
        const optionIndex = options.findIndex(({ key }) => activeOptionKey === key);

        this.listRef?.scrollTo({ index: optionIndex });
        changedState.activeKey = activeOptionKey;
      }
    } else {
      changedState.activeKey = undefined;
    }

    this.setState(changedState, () => {
      if (visible) {
        this.focus();
        // show scrollbar when open
        this.listRef?.scrollTo(undefined);
      }
    });
  };

  //rc-trigger触发visibleChange事件
  visibleChangeFromTrigger = visible => {
    const { selectValueForMultiplePanel } = this.state;
    const { mode } = this.props;
    if (!visible && mode === 'multiple') {
      this.setState({
        selectValue: selectValueForMultiplePanel,
      });
    }
    this.changeVisibleState(visible);
  };

  // 焦点操作
  focusEvent = (event: 'focus' | 'blur') => {
    const { showSearch, loading } = this.props;
    if (loading) return;

    setTimeout(() => {
      const targetElement = showSearch ? this.selectSearch : this.selection;
      targetElement && targetElement[event]();
    }, 50);
  };

  // 聚焦
  focus() {
    this.focusEvent('focus');
  }

  // 失焦
  blur() {
    this.focusEvent('blur');
  }

  //处理 label、option的click操作
  onOptionClick = (e, obj, clickLabelClose: boolean) => {
    e && e.stopPropagation();
    const { onChange, mode, onSelect, onDeselect, labelInValue } = this.props;
    const { selectValue } = this.state;
    const index = selectValue.findIndex(selected => selected.key === obj.key);
    const isSelected = index >= 0;

    if (mode === 'single') {
      this.changeVisibleState(false);
      this.setState({
        selectValue: [obj],
      });
      if (!isSelected) {
        if (labelInValue) {
          onChange(obj);
        } else {
          onChange(obj.key);
        }
      }
    }

    if (mode === 'multiple') {
      let changedValue,
        changedObj = {};
      // 点击label的关闭icon
      if (clickLabelClose) {
        const { selectValueForMultiplePanel } = this.state;
        const indexInMultiple = selectValueForMultiplePanel.findIndex(
          selected => selected.key === obj.key,
        );
        const firstValue = selectValueForMultiplePanel.slice(0, indexInMultiple);
        const restValues = selectValueForMultiplePanel.slice(indexInMultiple + 1);
        changedValue = [...firstValue, ...restValues];
        changedObj = {
          selectValue: changedValue,
          selectValueForMultiplePanel: changedValue,
        };

        //click on label close will trigger the onchange event.
        onDeselect(obj);

        if (labelInValue) {
          onChange(changedValue);
        } else {
          onChange(changedValue.map(selected => selected.key));
        }
      } else {
        //option 点击
        changedValue = isSelected
          ? [...selectValue.slice(0, index), ...selectValue.slice(index + 1)]
          : [...selectValue, obj];

        changedObj = { selectValue: changedValue };

        if (isSelected) {
          onDeselect(obj);
        } else {
          onSelect(obj);
        }
      }

      this.setState(changedObj);
    }
  };

  //获取加料后的children
  getProcessedChildren = (children, dropdownCls: string) => {
    return React.Children.map(children, (child: any) => {
      const typeOfChildren = Object.prototype.toString.call(child).slice(8, -1).toLowerCase();
      if (!!child && typeOfChildren === 'object' && child.type && child.type.isSelectOption) {
        const { selectValue, activeKey } = this.state;
        const { showOptionCheckedIcon } = this.props;
        const value = 'value' in child.props ? child.props.value : child.key;
        //对children中的Option 进行事件绑定、参数补充
        return React.cloneElement(child, {
          prefixCls: `${dropdownCls}-option`,
          checked: !!selectValue.find(obj => obj && obj.key === value),
          value: value,
          activeKey: activeKey,
          showOptionCheckedIcon: showOptionCheckedIcon,
          onOptionClick: this.onOptionClick,
          // NOTICE: onOptionMouseEnter REMOVED (No definition found)
          // onOptionMouseEnter: this.onOptionMouseEnter,
          // TODO 有什么作用
          ref: value,
          children: this.getProcessedChildren(child.props.children, dropdownCls),
        });
      } else if (
        !!child &&
        typeOfChildren === 'object' &&
        child.type &&
        child.type.isSelectOptGroup
      ) {
        return React.cloneElement(child, {
          prefixCls: `${dropdownCls}-option-group`,
          children: this.getProcessedChildren(child.props.children, dropdownCls),
        });
      } else {
        return child;
      }
    });
  };

  //获取筛选后children
  getFilteredChildren = (children, ChildrenList = []) => {
    const { filterOption } = this.props;
    const { searchValue } = this.state;
    const typeOfOption = Object.prototype.toString.call(filterOption).slice(8, -1).toLowerCase();
    React.Children.forEach(children, (child: any) => {
      let filterFlag = false;
      if (child && child.type && child.type.isSelectOption) {
        if (typeOfOption === 'function') {
          filterFlag = (filterOption as Function)(searchValue, child);
        } else if (typeOfOption === 'boolean') {
          filterFlag = filterOption as boolean;
        }
        if (filterFlag) {
          ChildrenList.push(child);
        }
      } else if (child && child.type && child.type.isSelectOptGroup) {
        const children = this.getFilteredChildren(child.props.children);
        ChildrenList.push(
          React.cloneElement(child, {
            children: children,
            _isShow: !!(children && children.length), //搜索后分组下没有东西就隐藏该分组
          }),
        );
      }
    });

    return ChildrenList;
  };

  //多选-取消
  handleCancelSelect = () => {
    const { selectValueForMultiplePanel } = this.state;
    this.changeVisibleState(false);
    this.setState({
      selectValue: selectValueForMultiplePanel,
    });
  };

  //多选-确定
  handleConfirmSelect = () => {
    const { onChange, labelInValue } = this.props;
    const { selectValue } = this.state;
    this.changeVisibleState(false);
    this.setState({
      selectValueForMultiplePanel: selectValue,
    });
    let outputSelectedValue: SelectValue | SelectValue[] = selectValue;
    // 是否过滤失效的选中项
    if (this.props.filterInactiveOption) {
      const optionList = Select.getOptionFromChildren(
        this.props.children,
        [],
        child => !child.props.disabled,
      );
      outputSelectedValue = selectValue.filter(item => {
        return !!optionList.find(option => {
          return option.key === item.key;
        });
      });
    }
    if (labelInValue) {
      onChange(outputSelectedValue);
    } else {
      onChange(outputSelectedValue.map(selected => selected.key));
    }
  };

  //判断是否全选
  isSelectAll = (isMultiplePanel = false) => {
    const { selectValueForMultiplePanel, selectValue } = this.state;
    const optionList = Select.getOptionFromChildren(
      this.props.children,
      [],
      child => !child.props.disabled,
    );
    //全选判断逻辑：option中每一项都能在selected中找到（兼容后端搜索的全选判断）
    if (isMultiplePanel) {
      return (
        optionList.length &&
        optionList.every(selected => {
          return !!selectValueForMultiplePanel.find(option => option.key === selected.key);
        })
      );
    } else {
      return optionList.every(selected => {
        return !!selectValue.find(option => option.key === selected.key);
      });
    }
  };

  //处理键盘事件：ENTER/ESC/UP/DOWN
  handleKeyboardEvent = e => {
    const keyCode = e.keyCode;
    if (keyCode === KeyCode.ESC && this.props.esc) {
      this.changeVisibleState(false);
      return;
    }
    if (keyCode === KeyCode.ENTER || keyCode === KeyCode.UP || keyCode === KeyCode.DOWN) {
      e.preventDefault();
      const { children, mode, labelInValue, onChange } = this.props;
      const { activeKey, selectValue } = this.state;
      const filteredList = this.getFilteredChildren(children); // 筛选过的数组
      const optionList = Select.getOptionFromChildren(
        filteredList,
        [],
        child => !child.props.disabled,
      ); // 去除 disabled 选项
      const optionListLen = optionList.length;
      if (!optionListLen) return;
      //enter
      if (keyCode === KeyCode.ENTER) {
        const activeTabIndex = optionList.findIndex(option => option.key === activeKey);
        // activeKey不在列表中
        if (activeTabIndex !== -1) {
          if (!selectValue.find(selected => selected.key === activeKey)) {
            if (mode === 'single') {
              this.changeVisibleState(false);
              this.setState(
                {
                  selectValue: [optionList[activeTabIndex]],
                  activeKey: undefined,
                },
                () => {
                  if (labelInValue) {
                    onChange(this.state.selectValue[0]);
                  } else {
                    onChange(this.state.selectValue.map(selected => selected.key)[0]);
                  }
                },
              );
            } else if (mode === 'multiple') {
              this.setState({
                selectValue: [...selectValue, optionList[activeTabIndex]],
              });
            }
          }
        }
      }
      //38 up 40 down
      if (keyCode === KeyCode.UP || keyCode === KeyCode.DOWN) {
        // 有activeKey
        if (activeKey !== undefined) {
          const activeTabIndex = optionList.findIndex(option => option.key === activeKey);
          // activeKey不在列表中
          if (activeTabIndex === -1) {
            this.setState(
              {
                activeKey: optionList[0].key,
              },
              () => {
                this.setActiveOptionIntoView(0);
              },
            );
            return;
          }
          // 上按钮
          let nextIndex = 0;
          if (keyCode === KeyCode.UP) {
            //超出到最后一个
            if (activeTabIndex === 0) {
              nextIndex = optionListLen - 1;
            } else {
              nextIndex = activeTabIndex - 1;
            }
          } else if (keyCode === KeyCode.DOWN) {
            if (activeTabIndex + 1 === optionListLen) {
              nextIndex = 0;
            } else {
              nextIndex = activeTabIndex + 1;
            }
          }
          this.setState(
            {
              activeKey: optionList[nextIndex].key,
            },
            () => {
              this.setActiveOptionIntoView(nextIndex);
            },
          );
        } else {
          this.setState(
            {
              activeKey: optionList[0].key,
            },
            () => {
              this.setActiveOptionIntoView(0);
            },
          );
        }
      }
    }
  };

  //处理option的激活态
  setActiveOptionIntoView = (index: number) => {
    if (this.listRef) {
      this.listRef.scrollTo({ index });
    }
  };

  // selectionChange后重新定位trigger
  resizeTrigger = () => {
    if (this.trigger && this.trigger._component && this.trigger._component.alignInstance) {
      this.trigger._component.alignInstance.forceAlign();
    }
  };

  //下拉框内容
  getDropdownPanel(Locale: LocaleProperties['Select']) {
    const {
      virtual,
      allowClear,
      children,
      dropdownClassName,
      dropdownStyle,
      extraOptions,
      loading,
      maxCount,
      maxScrollHeight,
      mode,
      onPopupScroll,
      prefixCls,
      searchInputProps,
      showSearch,
      showSelectAll,
      showSingleClear,
      required,
      errorMessage = Locale.errorMessage,
      notFoundContent = Locale.notFoundContent,
      placeholder = Locale.placeholder,
      searchPlaceholder = Locale.searchPlaceholder,
      selectAllText = Locale.selectAllText,
    } = this.props;
    const { searchValue, selectValue } = this.state;
    const dropdownCls = `${prefixCls}-dropdown`;
    //获取筛选后的children
    const optionFilteredList = this.getFilteredChildren(
      this.getProcessedChildren(children, dropdownCls),
    );
    const showNotFoundContent = !Select.getOptionFromChildren(optionFilteredList).length; // optionList为空判断
    const maxCountError = 'maxCount' in this.props && selectValue.length > maxCount; // maxCount值存在且小于选择数量
    const requiredError = mode === 'multiple' && required && !selectValue.length; // required模式下，必须要有option选择
    const multipleConfirmDisabled = maxCountError || requiredError;
    const dropdownPanelCls = classNames(dropdownCls, {
      [dropdownClassName]: !!dropdownClassName,
    });

    const renderList = [];

    //全选按钮-多选未搜索的情况下存在
    if (!searchValue && showSelectAll && mode === 'multiple') {
      renderList.push(
        <li
          className={classNames(
            { [`${dropdownCls}-option-item`]: true },
            { ['checked checked-icon']: this.isSelectAll() },
          )}
          onClick={this.selectAllOption}
        >
          {selectAllText}
        </li>,
      );
    }

    //清空选项按钮-单选未搜索的情况下存在
    if (!searchValue && showSingleClear && mode === 'single') {
      renderList.push(
        <li
          key="single-clear-item"
          className={`${dropdownCls}-option-item`}
          onClick={this.emptySelectValue}
        >
          {placeholder}
        </li>,
      );
    }

    //预留置顶项
    if (extraOptions) {
      renderList.push(extraOptions);
    }

    if (showNotFoundContent) {
      renderList.push(
        <div key="not-found" className={`${dropdownCls}-not-found`}>
          {notFoundContent}
        </div>,
      );
    } else {
      renderList.push(...optionFilteredList);
    }

    return (
      <div
        className={dropdownPanelCls}
        onKeyDown={this.handleKeyboardEvent}
        ref={selection => (this.selection = selection)}
        style={dropdownStyle}
        tabIndex={0}
      >
        {loading ? (
          <div className={`${dropdownCls}-loading`}>
            <div>
              <div>
                <Spin.Container style={{ height: 32, justifyContent: 'left' }}>
                  <Spin size="small" tip="加载中..." />
                </Spin.Container>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${dropdownCls}-content`}>
            {
              //搜索框
              showSearch && (
                <SelectSearch
                  allowClear={allowClear}
                  emitEmpty={this.emptySearchValue}
                  prefixCls={`${dropdownCls}-search`}
                  ref={node => (this.selectSearch = node)}
                  searchInputProps={searchInputProps}
                  searchPlaceholder={searchPlaceholder}
                  searchValue={searchValue}
                  updateSearchValue={this.updateSearchValue}
                />
              )
            }
            <List
              ref={node => (this.listRef = node)}
              data={renderList}
              virtual={virtual}
              itemKey="key"
              fullHeight={false}
              style={{ width: '100%' }}
              height={Number(maxScrollHeight) - 16}
              itemHeight={32}
              onScroll={onPopupScroll}
            >
              {item => item}
            </List>
            {
              //多选的点击取消、确定按钮组
              mode === 'multiple' && (
                <div>
                  {maxCountError && (
                    <div className={`${dropdownCls}-error-panel`}>
                      <p className={`${dropdownCls}-error-panel-msg`}>{errorMessage}</p>
                    </div>
                  )}
                  <div className={`${dropdownCls}-footer`}>
                    <Button
                      className={`${dropdownCls}-footer-btn`}
                      onClick={this.handleCancelSelect}
                    >
                      {Locale.cancelText}
                    </Button>
                    <Button
                      className={`${dropdownCls}-footer-btn`}
                      onClick={this.handleConfirmSelect}
                      disabled={multipleConfirmDisabled}
                      type="primary"
                    >
                      {Locale.confirmText}
                    </Button>
                  </div>
                </div>
              )
            }
          </div>
        )}
      </div>
    );
  }

  // 获取面板内容
  getSelectionPanel(Locale: LocaleProperties['Select']) {
    const {
      className,
      tagWidth,
      disabled,
      labelClear,
      loading,
      maxLabelClearPanelHeight,
      mode,
      onMouseEnter,
      onMouseLeave,
      prefixCls,
      showArrow,
      showMultipleSelectAll,
      size,
      style,
      placeholder = Locale.placeholder,
      multipleSelectAllText = Locale.multipleSelectAllText,
    } = this.props;
    const { selectValue, selectValueForMultiplePanel, popupVisible } = this.state;
    const selectionCls = `${prefixCls}`;
    const selectionPanelCls = classNames(
      { [`${selectionCls}`]: true },
      { [className]: !!className },
      { [`${selectionCls}-disabled`]: disabled },
      { [`open`]: popupVisible },
      { [`${selectionCls}-large`]: size === 'large' },
      { [`${selectionCls}-small`]: size === 'small' },
    );
    const panelStyle = {
      ...style,
    };
    if (labelClear) {
      panelStyle.paddingRight = 0;
      if (mode === 'multiple' && selectValueForMultiplePanel.length) {
        panelStyle.height = 'auto';
      }
    }
    let multipleTitle = '';
    if (mode === 'multiple' && !labelClear) {
      const titleArray = selectValueForMultiplePanel.map(panel => panel.title);
      const isShowTitle = titleArray.every(title => !!title);
      multipleTitle = isShowTitle ? titleArray.join('、') : '';
    }
    return (
      <div
        className={selectionPanelCls}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={panelStyle}
      >
        {loading ? (
          <div className={`${selectionCls}-loading`}>
            <div>
              <Spin.Container style={{ height: 32, justifyContent: 'left' }}>
                <Spin size="small" tip="加载中..." />
              </Spin.Container>
            </div>
          </div>
        ) : (
          <div className={`${selectionCls}-content`}>
            {
              // showArrow并且不是可删除label模式下出现箭头
              showArrow && !labelClear && (
                <div className={`${selectionCls}-caret`}>
                  <Icon type="down-fill" className={classNames({ ['open']: popupVisible })} />
                </div>
              )
            }
            {
              // 没有值的情况下显示placeholder
              ((!selectValue.length && mode === 'single') ||
                (!selectValueForMultiplePanel.length && mode === 'multiple')) && (
                <div className={`${selectionCls}-placeholder`}>{placeholder}</div>
              )
            }
            {
              // 单选模式下有值显示值的label
              mode === 'single' && !!selectValue.length && (
                <div className={`${selectionCls}-option-single`} title={selectValue[0].title}>
                  {selectValue[0].label}
                </div>
              )
            }
            {
              // 多选模式下区分labelClear
              // selectValueForMultiplePanel的更新时机：
              // 1.初始化value、defaultValue
              // 2.props.value 更改
              // 3.多选取消、确定按钮点击
              // 4.label.click事件
              mode === 'multiple' &&
                (labelClear ? (
                  //仅在有选中数据时渲染，fix空状态面板上方高度问题
                  selectValueForMultiplePanel && selectValueForMultiplePanel.length ? (
                    <Animate
                      onEnd={this.resizeTrigger}
                      component="div"
                      transitionName="zoom"
                      style={{
                        maxHeight: maxLabelClearPanelHeight ? maxLabelClearPanelHeight : null,
                      }}
                      className={`${selectionCls}-option-clearable-list`}
                    >
                      {selectValueForMultiplePanel.map(option => (
                        <div
                          className={`${selectionCls}-option-clearable-option`}
                          style={{ width: tagWidth }}
                          key={option.key}
                          title={option.title}
                        >
                          <span className={`${selectionCls}-option-clearable-option-content`}>
                            {option.label}
                          </span>
                          {!disabled && (
                            <span
                              className={`${selectionCls}-option-clearable-option-close`}
                              onClick={e => this.onOptionClick(e, option, true)}
                            >
                              <Icon type="close-modal-line" />
                            </span>
                          )}
                        </div>
                      ))}
                    </Animate>
                  ) : null
                ) : (
                  <div className={`${selectionCls}-option-multiple`} title={multipleTitle}>
                    {this.isSelectAll(true) && showMultipleSelectAll ? (
                      <span>{multipleSelectAllText}</span>
                    ) : (
                      selectValueForMultiplePanel.map((option, index) => (
                        <span key={option.key} className={`${selectionCls}-option-multiple-option`}>
                          <span>{option.label}</span>
                          {index + 1 !== selectValueForMultiplePanel.length && '、'}
                        </span>
                      ))
                    )}
                  </div>
                ))
            }
          </div>
        )}
      </div>
    );
  }

  render() {
    const { disabled, dropdownMatchSelectWidth, getPopupContainer, placement, prefixCls } =
      this.props;

    const { popupVisible, dropdownWidth } = this.state;
    const popupStyle = {};
    const widthProp = dropdownMatchSelectWidth ? 'width' : 'minWidth';
    if (dropdownWidth) {
      popupStyle[widthProp] = `${dropdownWidth}px`;
    }

    const LocaleContextValue = this.context;
    const Locale = LocaleContextValue && LocaleContextValue['Select'];
    return (
      <Trigger
        action={disabled ? [] : ['click']}
        builtinPlacements={placements}
        ref={node => (this.trigger = node)}
        getPopupContainer={getPopupContainer}
        onPopupVisibleChange={this.visibleChangeFromTrigger}
        popup={this.getDropdownPanel(Locale)}
        popupPlacement={placement}
        popupVisible={popupVisible}
        prefixCls={`${prefixCls}-popup`}
        popupStyle={popupStyle}
        popupTransitionName="slide-up"
      >
        {this.getSelectionPanel(Locale)}
      </Trigger>
    );
  }
}

polyfill(Select);

export default Select;
